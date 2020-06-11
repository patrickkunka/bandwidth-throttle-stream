interface IConfig {
    /**
     * The maximum number of bytes allowed to pass through the
     * throttle, each second.
     *
     * @default Infinity
     */

    bytesPerSecond?: number;

    /**
     * Defines how frequently the processing of bytes should be
     * distributed across each second. Each time the internal
     * scheduler "ticks", data will be processed and written out.
     *
     * A higher value will ensure smoother throttling for requests
     * that complete within a second, but will be more expensive
     * computationally and will ultimately be constrained by the
     * performance of the JavaScript runtime.
     *
     * @default 40
     */

    ticksPerSecond?: number;

    /**
     * The frequency of samples used to determine the `averageBytesPerSecond` metric.
     *
     * @default 1000
     */

    throughputSampleIntervalMs?: number;

    /**
     * The maximum number of samples that should contribute to the
     * `averageBytesPerSecond` metric rolling average.
     *
     * @default 4
     */

    throughputSampleSize?: number;
}

export default IConfig;
