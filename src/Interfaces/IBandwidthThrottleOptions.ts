interface IBandwidthThrottleOptions {
    /**
     * The maximum number of bytes allowed to pass through the
     * throttle, per the defined interval.
     */

    bytesPerSecond?: number;
}

export default IBandwidthThrottleOptions;
