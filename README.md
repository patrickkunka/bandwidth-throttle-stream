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
    - [Handling Completion](#handling-completion)
    - [Converting Between Reader Formats in Deno](#converting-between-reader-formats-in-deno)
- [Configuration Options](#configuration-options)
- [Dynamic Configuration](#dynamic-configuration)
- [Aborted Requests](#aborted-requests)
- [Repo Structure](#repo-structure)

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

In Deno, all modules are imported from URLs as ES modules. Versioned [releases](https://github.com/patrickkunka/bandwidth-throttle-stream/releases) of `bandwidth_throttle_stream` are available from [deno.land/x](https://deno.land/x). Note that as per Deno convention, the package name is delineated with underscores (`_`).

```js
import {createBandwidthThrottleGroup} from 'https://deno.land/x/bandwidth_throttle_stream/mod.ts';
```

The above URL will return the latest release, but it is strongly advised to lock your import to a specific version using the following syntax, where the `x.y.z` semver can be any published version of the library:

```js
import {createBandwidthThrottleGroup} from 'https://deno.land/x/bandwidth_throttle_stream@x.y.z/mod.ts';
```

## Usage

### Creating a Group

Using the imported `createBandwidthThrottleGroup` factory function, we must firstly create a "bandwidth throttle group" which will be configured with a specific throughput in bytes (B) per second.

```js
// Create a group with a configured available bandwidth in bytes (B) per second.

const bandwidthThrottleGroup = createBandwidthThrottleGroup({
    bytesPerSecond: 500000 // 500KB/s
});
```

Typically we would create a single group only for a server running a simulation, which all incoming network requests to be throttled are routed through. However, we could also create multiple groups if we wanted to run multiple simulations with different configurations on a single server.

### Attaching Throttles

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

##### Deno example: Piping between a readable stream and a reader:
```ts
// Attach a throttle to a group (e.g. in response to an incoming request)

const throttle = bandwidthThrottleGroup.createBandwidthThrottle(contentLength);

// Throttle the response by piping a `ReadableStream` to a `ReadableStreamDefaultReader`:

const reader = someReadableStream
    .pipeThrough(throttle)
    .getReader()
```


Note that a number value for `contentLength` (in "bytes") must be passed when creating an individual throttle. This should be the total size of data for the request being passed through the throttle, and is used to allocate memory upfront in a single `Uint8Array` typed array, thus preventing expensive GC calls as backpressure builds up. When throttling HTTP requests, `contentLength` can be obtained from the `'content-length'` header, once the headers of the request have arrived:

##### Node.js (Express) example: Obtaining `content-length` from `req` headers:
```js
const contentLength = parseInt(req.get('content-length'))
```

##### Deno example: Obtaining `content-length` from `fetch` headers:

```ts
const { body, headers } = await fetch(destination);

const contentLength = parseInt(headers.get("content-length"));
```

If no `contentLength` value is available (e.g. the underlying server does not implement a `content-length` header), then it should be set to a value no smaller than the size of largest expected request. To keep memory usage within reason, arbitrarily high values should be avoided.

### Handling Completion

We may want to perform some specific logic once a request is complete, and all data has been processed through the throttle.

In Node.js, rather than piping directly to a response, we can use the `done` event to manually write data, and the `end` event to manually handled completion.

##### Node.js example: Hooking into the `end` event of a writable stream
```js
request
    .pipe(throttle)
    .on('data', chunk => response.write(chunk)
    .on('end', () => {
        response.end();

        // any custom completion logic here
    });
```

In Deno, the call to `request.respond()` returns a promise which resolves once the request is completed and all data has been pulled into the `body` reader.

##### Deno example: responding to a request with a reader and a status code
```ts
import {readerToDenoReader} from 'https://deno.land/x/bandwidth_throttle_stream@x.y.z/mod.ts';

const reader = request
    .pipeThrough(throttle)
    .getReader()

await request.respond({
    status: 200
    body: readerToDenoReader(reader, contentLength),
});

// any custom completion logic here
```

### Converting Between Reader Formats in Deno

Note that in the Deno example above, a reader may be passed directly to `request.respond()` allowing real-time streaming of the throttled output. However, the Deno [`std`](https://deno.land/std/http/server.ts) server expects a `Deno.Reader` as a `body` (rather than the standard `ReadableStreamDefaultReader`), meaning that conversion is needed between the two.

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

const reader = request
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

## Repo Structure

This repository contains shared source code for consumption by both Deno (TypeScript ES modules), and Node.js (JavaScript Common.js modules).

Wherever a Deno or Node.js specific API is needed, a common abstraction is created that can be swapped at build time. Platform specific implementations are denoted with either a `.deno.ts` or `.node.ts` file extension. Platform specific entry points to these abstractions reside in the `lib/Platform/` directory.

The source code (contained in the `lib/` directory) is ready for direct consumption by Deno is written in ESNext TypeScript, but requires some modifications to produce Node.js compatible NPM distribution code.

The Node.js build process comprises the following steps:
1. Copy all contents of `lib/` to `src/` (git ignored)
1. Remove all `.ts` file extensions from modules in `src/` (see `scipts/replace.ts`)
1. Replace any imports from `src/Platform/*` with a `@Platform` alias (see `scipts/replace.ts`)
1. Run `tsc` on contents of `src/` using the [`ts-transform-paths`](https://github.com/zerkalica/zerollup/tree/master/packages/ts-transform-paths) plugin to replace `@Platform` alias with Node.js entry points.
1. Output compiled, Common.js code to `dist/` (git ignored), and publish `dist/` to NPM.