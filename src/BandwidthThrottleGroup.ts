import BandwidthThrottle from './BandwidthThrottle';
import Config from './Config';
import IConfig from './Interfaces/IConfig';
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
    public config: Readonly<Config> = new Config();

    private inFlightRequests: BandwidthThrottle[] = [];
    private bandwidthThrottles: BandwidthThrottle[] = [];
    private clockIntervalId: NodeJS.Timeout | null = null;
    private lastTickTime: number = -1;
    private tickIndex: number = 0;
    private secondIndex: number = 0;

    /**
     * @param options Consumer-provided options defining the
     *  throttling behaviour.
     */

    constructor(options: IConfig) {
        Object.assign(this.config, options);

        this.createBandwidthThrottle = this.createBandwidthThrottle.bind(this);
        this.handleRequestStop = this.handleRequestStop.bind(this);
        this.handleRequestStart = this.handleRequestStart.bind(this);
        this.processInFlightRequests = this.processInFlightRequests.bind(this);
    }

    public configure(options: IConfig): void {
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
            this.handleRequestStop,
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

    private handleRequestStart(bandwidthThrottle: BandwidthThrottle): void {
        this.inFlightRequests.push(bandwidthThrottle);

        if (this.clockIntervalId) return;

        // Start the processing clock when the first request starts

        this.clockIntervalId = this.startClock();
    }

    /**
     * Removes the reference of a throttle from the `inFlightRequests` array
     * in order to redistribute bandwidth while a request is inactive or after
     * it has ended.
     *
     * If no other in flight requets are active at that point, the internal
     * clock is stopped to save resources.
     */

    private handleRequestStop(bandwidthThrottle: BandwidthThrottle): void {
        this.inFlightRequests.splice(
            this.inFlightRequests.indexOf(bandwidthThrottle),
            1
        );

        if (this.inFlightRequests.length === 0) this.stopClock();
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
        this.tickIndex = 0;
        this.secondIndex = 0;
    }

    // step 1 - evenly destribute bytes between active requests
    //  if cannot be evenly divided, use per second rotation to balance
    // step 2 - for each individual request, distribute over resolution

    private processInFlightRequests(): void {
        // Check the time since data was last processed

        const elapsedTime = Date.now() - this.lastTickTime;

        // If throttling active and the time elapsed is less than
        // the provided interval duration, do nothing.

        if (this.config.isThrottled && elapsedTime < this.config.tickDurationMs)
            return;

        const period = this.secondIndex % this.inFlightRequests.length;

        for (let i = 0; i < this.inFlightRequests.length; i++) {
            const currentInFlightRequestsCount = this.inFlightRequests.length;
            const bandwidthThrottle = this.inFlightRequests[i];

            const rotatedIndex = (i + period) % currentInFlightRequestsCount;

            const bytesPerRequestPerSecond = getPartitionedIntegerPartAtIndex(
                this.config.bytesPerSecond,
                this.inFlightRequests.length,
                rotatedIndex
            );

            const bytesPerRequestPerTick = getPartitionedIntegerPartAtIndex(
                bytesPerRequestPerSecond,
                this.config.resolutionHz,
                this.tickIndex
            );

            bandwidthThrottle.process(bytesPerRequestPerTick);

            if (this.inFlightRequests.length < currentInFlightRequestsCount) {
                i--;
            }
        }

        this.tickIndex++;

        // Increment the tick index, or reset it to 0 whenever it surpasses
        // the desired resolution

        if (this.tickIndex === this.config.resolutionHz) {
            this.tickIndex = 0;
            this.secondIndex++;
        }

        // Increment the last push time, and return

        this.lastTickTime += elapsedTime;
    }
}

export default BandwidthThrottleGroup;
