interface IThroughputData {
    /**
     * The average throughput, calculated as the mean of `config.throughputSampleSize` samples,
     * with samples taken every `config.throughputSampleIntervalMs`.
     */

    averageBytesPerSecond: number;

    /**
     * A percentage (between 0 and 1) indicating amount of bandwidth utilised by the throttle
     * group. Calculated by dividing `config.bytesPerSecond` by `averageBytesPerSecond`.
     */

    utilization: number;
}

export default IThroughputData;
