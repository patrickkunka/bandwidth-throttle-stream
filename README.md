![CI](https://github.com/patrickkunka/bandwidth-throttle-stream/workflows/CI/badge.svg) [![Coverage Status](https://coveralls.io/repos/github/patrickkunka/bandwidth-throttle-stream/badge.svg?branch=master)](https://coveralls.io/github/patrickkunka/bandwidth-throttle-stream?branch=master)

# Bandwidth Throttle Stream

A [Node.js](https://nodejs.org/en/) and [Deno](https://deno.land/) transform stream for throttling bandwidth which distributes available bandwidth evenly between all requests in a "group", accurately simulating the effect of network conditions on simultaneous overlapping requests.

#### Features
- Idiomatic pipeable [Transform](https://nodejs.org/api/stream.html) API for use in Node.js
- Idiomatic pipeable [TransformStream](https://developer.mozilla.org/en-US/docs/Web/API/TransformStream) API for use in Deno
- Distributes the desired bandwidth evenly over each second
- Distributes the desired bandwidth evenly between all active requests
- Abortable requests ensure bandwidth is redistributed if a client aborts a request

#### Contents
- [Node.js Installation](#nodejs-installation)
- [Deno Installation](#deno-installation)
- [Usage](#usage)
    - [Creating a Group](#creating-a-group)
    - [Attaching Throttles](#attaching-throttles)
    - [Handling Output](#handling-output)
- [Configuration Options](#configuration-options)
- [Dynamic Configuration](#dynamic-configuration)
- [Aborted Requests](#aborted-requests)

## Node.js Installation

Firstly, install the package using your package manager of choice.

```
npm install bandwidth-throttle-stream
```

You may then import the `createBandwidthThrottleGroup()` factory function into your project.

```js
import {createBandwidthThrottleGroup} from 'bandwidth-throttle-stream';
```

## Deno Installation

In Deno, all libraries are imported from URLs as ES modules. Versioned releases of `bandwidth-throttle-stream` are available from the [Pika](http://pika.dev) CDN:

```js
import {createBandwidthThrottleGroup} from 'https://cdn.pika.dev/bandwidth-throttle-stream/mod.ts';
```

The above URL will return the latest release, but it is strongly advised to lock your import to a specific version using the following syntax, where the `x.y.z` semver can be any published version of the library:

```js
import {createBandwidthThrottleGroup} from 'https://cdn.pika.dev/bandwidth-throttle-stream@x.y.z/mod.ts';
```

## Usage

#### Creating a Group

Using the imported `createBandwidthThrottleGroup` factory function, we must firstly create a "bandwidth throttle group" which will be configured with a specific throughput in bytes (B) per second.

```js
// Create a group with a configured available bandwidth in bytes (B) per second.

const bandwidthThrottleGroup = createBandwidthThrottleGroup({
    bytesPerSecond: 500000 // 500KB/s
});
```

Typically we would create a single group only for a server running a simulation, which all incoming network requests to be throttled are routed through. However, we could also create multiple groups if we wanted to run multiple simulations with different configurations on a single server.

#### Attaching Throttles

Once we've created a group, we can then attach individual pipeable "throttles" to it, as requests come into our server.

The most simple integration would be to insert the throttle (via `.pipe`, or `.pipeThrough`) between a readable stream (e.g file system readout, server-side HTTP response), and the response stream of the incoming client request to be throttled.

##### Node.js example: Piping between readable and writable streams
```js
// Attach a throttle to a group (e.g. in response to an incoming request)

const throttle = bandwidthThrottleGroup.createBandwidthThrottle(contentLength);

// Throttle the response by piping a `stream.Readable` to a `stream.Writable`
// via the throttle

someReadableStream
    .pipe(throttle)
    .pipe(someWritableStream);

```

#### Deno example: Piping between a readable stream and a reader:
```ts
// Attach a throttle to a group (e.g. in response to an incoming request)

const throttle = bandwidthThrottleGroup.createBandwidthThrottle(contentLength);

// Throttle the response by piping a `ReadableStream` to a `ReadableStreamDefaultReader`:

someReadableStream
    .pipeThrough(throttle)
    .getReader()
```


Note that a number value for `contentLength` (in "bytes") must be passed when creating an individual throttle. This should be the total size of data for the request being passed through the throttle, and is used to allocate memory upfront in a single `Uint8Array` typed array, thus preventing expensive GC calls as backpressure builds up. When throttling HTTP requests, `contentLength` can be obtained from the `'content-length'` header, once the headers of the request have arrived:

#### Node.js (Express) example: Obtaining `content-length` from `req` headers:
```js
const contentLength = parseInt(req.get('content-length'))
```

#### Deno example: Obtaining `content-length` from `fetch` headers:

```ts
const { body, headers } = await fetch(destination);

const contentLength = parseInt(headers.get("content-length"));
```

#### Handling Output

In most cases however, we require more granular control of data output than simply piping to a writable stream (for example when throttling an HTTP request).

In these cases, we can use any of the Node.js stream events available such as `data` and `end`:

##### Node.js example: Hooking into the `end` event of a writable stream
```js
request
    .pipe(throttle)
    .on('data', chunk => response.write(chunk)
    .on('end', () => {
        // Set the response status of the HTTP request to 200
        response.status(200);
        // End the request
        response.end();
    });
```

##### Deno example: responding to a request with a reader and a status code
```ts
import {readerToDenoReader} from 'https://cdn.pika.dev/bandwidth-throttle-sream@^0.2.0/mod.ts';

...

await request.respond({
    status: 200
    body: readerToDenoReader(reader, contentLength),
});

// request sent successfully
```

Note that in the Deno example, a reader may be passed directly to `request.respond()` allowing real-time streaming of the throttled output. However, the Deno [`std`](https://deno.land/std/http/server.ts) server expects a `Deno.Reader` as a `body` (rather than the standard `ReadableStreamDefaultReader`), meaning that conversion is needed between the two.

The `readerToDenoReader` util is exposed for this purpose, and must be provided with both a reference to `ReadableStreamDefaultReader` (`reader`), and the `contentLength` of the request.

## Configuration Options

Each bandwidth throttle group accepts an optional object of configuration options:

```js
const bandwidthThrottleGroup = createBandwidthThrottleGroup({
    bytesPerSecond: 500000 // 500KB/s,
    ticksPerSecond: 20 // aim to write output 20x per second
});
```

The following options are available.

```ts
interface IConfig {
    /**
     * The maximum number of bytes allowed to pass through the
     * throttle, each second.
     *
     * @default Infinity
     */

    bytesPerSecond?: number;

    /**
     * Defines how frequently the processing of bytes should be
     * distributed across each second. Each time the internal
     * scheduler "ticks", data will be processed and written out.
     *
     * A higher value will ensure smoother throttling for requests
     * that complete within a second, but will be more expensive
     * computationally and will ultimately be constrained by the
     * performance of the JavaScript runtime.
     *
     * @default 40
     */

    ticksPerSecond?: number;
}
```

## Dynamic Configuration

A group can be reconfigured at any point after creation via its `.configure()` method, which accepts the same configuration interface as the `createBandwidthThrottleGroup()` factory.

```js
// Create a group with no throttling

const bandwidthThrottleGroup = createBandwidthThrottleGroup();

// ... after some configuration event:

bandwidthThrottleGroup.configure({
    bytesPerSecond: 6000000
})
```

## Aborted Requests

When a client aborts a requests, its important that we also abort the throttle, ensuring the group can re-balance available bandwidth correctly, and backpressure buffer memory is released.

##### Node.js example: Handling aborted requests

```js
const throttle = bandwidthThrottleGroup.createBandwidthThrottle(contentLength);

request.on('aborted', () => {
    // Client aborted request

    throttle.abort();
});

request
    .pipe(throttle)
    .pipe(response);
```

##### Deno example: Handling aborted requests

```ts
const throttle = bandwidthThrottleGroup.createBandwidthThrottle(contentLength);

request
    .pipeThrough(throttle)
    .getReader()

try {
    await request.respond({
        status: 200
        body: readerToDenoReader(reader, contentLength),
    });
} catch(err) {
    // request aborted or failed

    throttle.abort();
}
```