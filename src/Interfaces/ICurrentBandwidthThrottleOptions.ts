import IBandwidthThrottleOptions from './IBandwidthThrottleOptions';

interface ICurrentBandwidthThrottleOptions extends IBandwidthThrottleOptions {
    readonly bytesPerSecond: number;
    readonly bytesPerTickPerRequest: number;
    readonly tickDurationMs: number;
    readonly resolutionHz: number;
    readonly getBytesForTickAtIndex: (index: number) => number;
}

export default ICurrentBandwidthThrottleOptions;
