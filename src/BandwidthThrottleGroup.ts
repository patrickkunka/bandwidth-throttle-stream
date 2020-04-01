import BandwidthThrottle from './BandwidthThrottle';
import IBandwidthThrottleOptions from './Interfaces/IBandwidthThrottleOptions';
import getPartitionedIntegerPartAtIndex from './Util/getPartitionedIntegerPartAtIndex';

/**
 * A class used to configure and bridge between one or more
 * `BandwidthThrottle` instances, ensuring that the defined
 * available bandwidth is distributed as equally as possible
 * between any simultaneous requests.
 *
 * A `BandwidthThrottleGroup` instance must always be created
 * before attaching individual `throttle` instances to it via
 * its `createBandwidthThrottle()` method.
 */

class BandwidthThrottleGroup {
    private bytesPerSecond: number = Infinity;
    private inFlightRequests: number = 0;
    private bandwidthThrottles: BandwidthThrottle[] = [];
    private resolutionHz: number = 40;
    private clockIntervalId: NodeJS.Timeout | null = null;
    private lastTickTime: number = -1;
    private tickIndex: number = -1;

    /**
     * @param options Consumer-provided options defining the
     *  throttling behaviour.
     */

    constructor(options: IBandwidthThrottleOptions = {}) {
        Object.assign(this, options);

        this.handleRequestEnd = this.handleRequestEnd.bind(this);
        this.handleRequestStart = this.handleRequestStart.bind(this);
        this.processOpenRequests = this.processOpenRequests.bind(this);
    }

    /**
     * A dynamically readable object providing the attached
     * `BandwidthThrottle` instances with access to the group's
     * latest configuration values at all times.
     */

    public get options(): IBandwidthThrottleOptions {
        const self = this;

        return {
            get bytesPerSecond() {
                return self.bytesPerSecond;
            }
        };
    }

    private get tickDurationMs(): number {
        return 1000 / this.resolutionHz;
    }

    private getBytesForTickAtIndex(index: number): number {
        return getPartitionedIntegerPartAtIndex(
            this.bytesPerSecond,
            this.resolutionHz,
            index
        );
    }

    public configire(options: IBandwidthThrottleOptions): void {
        Object.assign(this, options);
    }

    /**
     * Creates and returns a pipeable `BandwidthThrottle` instance, and
     * attaches it to the group.
     *
     * @param id An optional unique ID for the throttle, for
     *  logging purposes.
     */

    public createBandwidthThrottle(id?: string): BandwidthThrottle {
        const bandwidthThrottle = new BandwidthThrottle(
            this.options,
            this.handleRequestStart,
            this.handleRequestEnd,
            id
        );

        this.bandwidthThrottles.push(bandwidthThrottle);

        return bandwidthThrottle;
    }

    /**
     * Destroys all bandwidth throttle instances in the group, terminating
     * any running intervals, such that the entire group may be garbage
     * collected.
     */

    public destroy(): void {
        while (this.bandwidthThrottles.length)
            this.bandwidthThrottles.pop()!.destroy();
    }

    /**
     * Increments the number of "in-flight" requests when a request in any
     * attached `BandwidthThrottle` instance starts.
     */

    private handleRequestStart(): void {
        this.inFlightRequests++;

        if (this.clockIntervalId) return;

        this.clockIntervalId = this.startClock();
    }

    /**
     * Decrements the number of "in-flight" requests when a request in any
     * attached `BandwidthThrottle` instance ends and all data has been sent.
     *
     * Destroys the `BandwidthThrottle` instance, as it can not
     * be used again once ended.
     */

    private handleRequestEnd(bandwidthThrottle: BandwidthThrottle): void {
        this.inFlightRequests = Math.max(0, this.inFlightRequests - 1);

        const index = this.bandwidthThrottles.indexOf(bandwidthThrottle);

        bandwidthThrottle.destroy();

        this.bandwidthThrottles.splice(index, 1);

        if (this.inFlightRequests === 0) this.stopClock();
    }

    private startClock(): NodeJS.Timeout {
        // NB: We iterate at a rate 5x faster than the desired tick duration.
        // This ensures greater accuracy of throttling and forces the
        // throttling to stay in sync, should the JavaScript timer become
        // delayed due to other thread-blocking processes.

        return setInterval(this.processOpenRequests, this.tickDurationMs / 5);
    }

    private stopClock(): void {
        if (!this.clockIntervalId) return;

        clearInterval(this.clockIntervalId);

        this.clockIntervalId = null;
    }

    private processOpenRequests(): void {
        // Record the time since data was last passed to the
        // readable stream

        const elapsedTime = Date.now() - this.lastTickTime;

        // If the time elapsed is less than the provided interval
        // duration, do nothing.

        if (
            this.bytesPerSecond !== Infinity &&
            elapsedTime < this.tickDurationMs
        )
            return;

        // Increment the tick index, or reset it to 0 whenever it surpasses
        // the desired resolution

        if (this.tickIndex === this.resolutionHz - 1) {
            this.tickIndex = -1;
        }

        this.tickIndex++;

        // Determine the total amounts of bytes that can be pushed on this tick,
        // across all active requests

        const bytesForTickIndex = this.getBytesForTickAtIndex(this.tickIndex);

        // Spread those bytes evenly across all active requests

        this.bandwidthThrottles.forEach((throttle, index) => {
            const bytesForTickPerRequest = getPartitionedIntegerPartAtIndex(
                bytesForTickIndex,
                this.bandwidthThrottles.length,
                index
            );

            throttle.process(bytesForTickPerRequest);
        });

        // Increment the last push time, and return

        this.lastTickTime += elapsedTime;
    }
}

export default BandwidthThrottleGroup;
