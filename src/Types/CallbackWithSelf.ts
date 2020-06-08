// @deno-types="./CallbackWithSelf.d.ts"

import BandwidthThrottle from '../BandwidthThrottle';

type CallbackWithSelf = (bandwidthThrottle: BandwidthThrottle) => void;

export default CallbackWithSelf;
