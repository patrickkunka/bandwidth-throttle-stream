import IBandwidthThrottleOptions from './IBandwidthThrottleOptions';

interface ICurrentBandwidthThrottleOptions extends IBandwidthThrottleOptions {
    readonly bytesPerInterval: number;
    readonly intervalDurationMs: number;
    readonly bytesPerIntervalPerRequest: number;
}

export default ICurrentBandwidthThrottleOptions;
