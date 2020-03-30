import BandwidthThrottle from './BandwidthThrottle';
import IBandwidthThrottleOptions from './Interfaces/IBandwidthThrottleOptions';
import ICurrentBandwidthThrottleOptions from './Interfaces/ICurrentBandwidthThrottleOptions';

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
    private bytesPerInterval!: number;
    private intervalDurationMs: number = 1000;
    private inFlightRequests: number = 0;
    private bandwidthThrottles: BandwidthThrottle[] = [];

    // NB: While the functionality herein throttles at a predicable constant rate,
    // the estimate that the client observes for any given throughput bandwidth
    // is about 95% less than what the proxy is told to produce. We assume this
    // can be attributed to inherent performance overhead of a JS, event-loop based
    // approach.

    // To overcome this, we instruct the proxy to pump through 3% more data than is
    // requested which results in an almost exact match between proxy configuration
    // and client estimation, which is consistent with a results produced by a
    // native implementation such as Charles Proxy or Chrome Dev Tools.

    private static UNDERPERFORMANCE_OFFSET_FACTOR = 1.0;

    /**
     * @param options Consumer-provided options defining the
     *  throttling behaviour.
     */

    constructor(options: IBandwidthThrottleOptions) {
        Object.assign(this, options);

        this.handleRequestEnd = this.handleRequestEnd.bind(this);
        this.handleRequestStart = this.handleRequestStart.bind(this);
    }

    /**
     * A dynamically readable object providing the attached
     * `BandwidthThrottle` instances with access to the group's
     * latest configuration values at all times.
     */

    public get options(): ICurrentBandwidthThrottleOptions {
        const self = this;

        return {
            get bytesPerInterval(): number {
                return self.bytesPerInterval;
            },
            get intervalDurationMs(): number {
                return self.intervalDurationMs;
            },
            get bytesPerIntervalPerRequest(): number {
                return (
                    (self.bytesPerInterval / self.inFlightRequests) *
                    BandwidthThrottleGroup.UNDERPERFORMANCE_OFFSET_FACTOR
                );
            }
        };
    }

    /**
     * Updates the group's `bytesPerInterval` value, such that the amount
     * of throttling can be increased or decreased at any time, even while
     * a request is in flight.
     */

    public setBytesPerInterval(bytesPerInterval: number): void {
        this.bytesPerInterval = bytesPerInterval;
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
    }
}

export default BandwidthThrottleGroup;
