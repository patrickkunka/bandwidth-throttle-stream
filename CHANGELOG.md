# 1.1.0
- Fixes issues when passing requests through an unbounded throttle (`bytesPerSecond` = `Infinity`).
- Adds public `onThroughputMetrics` metrics callback to the `BandwidthThrottleGroup`.

# 1.0.1

- Fixes issues on subsequent throttled requests in a group.
- Improved resilience for `readerToDenoReader` util.

# 1.0.0

- Initial release Node.js / Deno release.