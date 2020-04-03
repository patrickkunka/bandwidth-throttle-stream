# Bandwidth Throttle Stream

A Node.js transform stream for throttling bandwidth.

Distributes the configured bandwidth evenly between all active requests in a "group".

## Usage

```js
import {createBandwidthThrottleGroup} from 'bandwidth-throttle-stream';

// Create a group with a configured available bandwidth in bytes (B) per second.

const bandwidthThrottleGroup = createBandwidthThrottleGroup({
    bytesPerSecond: 500000 // 500KB/s
});

// Attach a throttle to a group (e.g. in response to an incoming request)

const throttle = bandwidthThrottleGroup.createBandwidthThrottle();

// Throttle the response by piping a readable stream to a writable
// stream via the throttle

request
    .pipe(throttle)
    .pipe(response);

```