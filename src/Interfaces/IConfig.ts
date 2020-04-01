interface IConfig {
    /**
     * The maximum number of bytes allowed to pass through the
     * throttle, each second.
     */

    bytesPerSecond?: number;

    /**
     * Defines how frequently the processing of bytes should be
     * distributed across each second.
     *
     * A higher resolution will ensure smoother throttling, but
     * will be more expensive computationally.
     */

    resolutionHz?: number;
}

export default IConfig;
