import BandwidthThrottle from './BandwidthThrottle';
import getPartitionedIntegerPartAtIndex from './Util/getPartitionedIntegerPartAtIndex';
import IConfig from './Interfaces/IConfig';
import Config from './Config';

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
    private config = new Config();
    private inFlightRequests: number = 0;
    private bandwidthThrottles: BandwidthThrottle[] = [];
    private clockIntervalId: NodeJS.Timeout | null = null;
    private lastTickTime: number = -1;
    private tickIndex: number = -1;

    /**
     * @param options Consumer-provided options defining the
     *  throttling behaviour.
     */

    constructor(options: IConfig) {
        Object.assign(this.config, options);

        this.handleRequestEnd = this.handleRequestEnd.bind(this);
        this.handleRequestStart = this.handleRequestStart.bind(this);
        this.processInFlightRequests = this.processInFlightRequests.bind(this);
    }

    private getBytesForTickAtIndex(index: number): number {
        return getPartitionedIntegerPartAtIndex(
            this.config.bytesPerSecond,
            this.config.resolutionHz,
            index
        );
    }

    public configire(options: IConfig): void {
        Object.assign(this.config, options);
    }

    /**
     * Creates and returns a pipeable `BandwidthThrottle` transform stream,
     * and attaches it to the group.
     *
     * @param id An optional unique ID for the throttle, for
     *  logging purposes.
     */

    public createBandwidthThrottle(id?: string): BandwidthThrottle {
        const bandwidthThrottle = new BandwidthThrottle(
            this.config,
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

        // Start the processing clock when the first request starts

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

        return setInterval(
            this.processInFlightRequests,
            this.config.tickDurationMs / 5
        );
    }

    private stopClock(): void {
        if (!this.clockIntervalId) return;

        clearInterval(this.clockIntervalId);

        this.clockIntervalId = null;
    }

    private processInFlightRequests(): void {
        // Check the time since the last invocation

        const elapsedTime = Date.now() - this.lastTickTime;

        // If throttling active and the time elapsed is less than
        // the provided interval duration, do nothing.

        if (this.config.isThrottled && elapsedTime < this.config.tickDurationMs)
            return;

        // Increment the tick index, or reset it to 0 whenever it surpasses
        // the desired resolution

        if (this.tickIndex === this.config.resolutionHz - 1) {
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
