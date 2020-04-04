![CI](https://github.com/patrickkunka/bandwidth-throttle-stream/workflows/CI/badge.svg) [![Coverage Status](https://coveralls.io/repos/github/patrickkunka/bandwidth-throttle-stream/badge.svg?branch=master)](https://coveralls.io/github/patrickkunka/bandwidth-throttle-stream?branch=master)

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
