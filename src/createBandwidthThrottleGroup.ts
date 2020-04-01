import BandwidthThrottleGroup from './BandwidthThrottleGroup';
import IConfig from './Interfaces/IConfig';

/**
 * Creates and returns a group used to configure and bridge between
 * one or more `BandwidthThrottle` instances, ensuring that the defined
 * available bandwidth is distributed as equally as possible
 * between any simultaneous requests.
 *
 * A `BandwidthThrottleGroup` instance must always be created
 * before attaching individual `throttle` instances to it via
 * its `createBandwidthThrottle()` method.
 *
 * @param options An optional object of configuration options for the group.
 */

const createBandwidthThrottleGroup = (options: IConfig = {}) =>
    new BandwidthThrottleGroup(options);

export default createBandwidthThrottleGroup;
