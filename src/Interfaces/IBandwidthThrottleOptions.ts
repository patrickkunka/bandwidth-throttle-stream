interface IBandwidthThrottleOptions {
    /**
     * The maximum number of bytes allowed to pass through the
     * throttle, per the defined interval.
     */

    bytesPerInterval: number;

    /**
     * An interval in ms, defining the frequency at which we apply
     * throttling to incoming data. A higher frequency will yield a
     * higher accuracy of throttling on smaller or sporadic requests.
     */

    intervalDurationMs?: number;
}

export default IBandwidthThrottleOptions;
