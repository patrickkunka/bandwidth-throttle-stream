import BandwidthThrottle from '../BandwidthThrottle.ts';

type CallbackWithSelf = (bandwidthThrottle: BandwidthThrottle) => void;

export default CallbackWithSelf;
