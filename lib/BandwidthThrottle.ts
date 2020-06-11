import Config from './Config.ts';
import {BaseTransformStream} from './Platform/mod.ts';
import CallbackWithSelf from './Types/CallbackWithSelf.ts';
import deferred from './Util/deferred.ts';

/**
 * A duplex stream transformer implementation, extending Node's built-in
 * `Transform` class. Receives input via a writable stream from a data
 * buffer (e.g. an HTTP request), and throttles output to a defined maximum
 * number of bytes per a defined interval.
 *
 * Configuration is received from a parent `BandwidthThrottleGroup` instance,
 * ensuring that available bandwidth is distributed evenly between all streams within
 * the group, mimicing the behaviour of overlapping network requests.
 */

class BandwidthThrottle extends BaseTransformStream {
    /**
     * A callback to be invoked when bytes are written
     * to the underlying `readable` stream. Used as a hook
     * for testing to confirm output rate.
     */

    public onBytesWritten: ((chunk: Uint8Array) => void) | null = null;

    private pendingBytesBuffer: Uint8Array;
    private pendingBytesCount = 0;
    private pendingBytesReadIndex = 0;
    private config: Readonly<Config>;
    private isInFlight: boolean = false;
    private handleRequestStart: CallbackWithSelf;
    private handleRequestStop: CallbackWithSelf;
    private handleRequestDestroy: CallbackWithSelf;
    private done = deferred<void>();

    constructor(
        /**
         * An object of configuration values provided by the
         * parent group.
         */

        config: Readonly<Config>,

        /**
         * The total number of bytes in the request to be throttled, to be used to define memory
         * allocation.
         */

        contentLength: number,

        /**
         * A handler to be invoked whenever a request starts processing data,
         * so that the parent group can increment of the total number of
         * requests in flight across the group.
         */

        handleRequestStart: CallbackWithSelf,

        /**
         * A handler to be invoked whenever a request stops processing
         * data, so that the parent group can decrement of the total
         * number of requests in flight across the group.
         */

        handleRequestEnd: CallbackWithSelf,

        /**
         * A handler to be invoked when a request has finished processing all
         * data for a request, and the throttle is no longer needed.
         */

        handleRequestDestroy: CallbackWithSelf
    ) {
        super({
            transform: (chunk: Uint8Array) => this.transform(chunk),
            flush: () => this.flush()
        });

        this.config = config;
        this.pendingBytesBuffer = new Uint8Array(contentLength);
        this.handleRequestStart = handleRequestStart;
        this.handleRequestStop = handleRequestEnd;
        this.handleRequestDestroy = handleRequestDestroy;
    }

    /**
     * To be called when the request being throttled is aborted in
     * order to rebalance the available bandwidth.
     */

    public abort(): void {
        this.handleRequestStop(this);
        this.destroy();
    }

    /**
     * Extracts a number of bytes from the pending bytes queue and
     * pushes it out to a piped writable stream.
     *
     * @returns The number of bytes processed through the throttle
     */

    public process(maxBytesToProcess: number = Infinity): number {
        const startReadIndex = this.pendingBytesReadIndex;

        const endReadIndex = Math.min(
            this.pendingBytesReadIndex + maxBytesToProcess,
            this.pendingBytesCount
        );

        const bytesToPushLength = endReadIndex - startReadIndex;

        if (bytesToPushLength > 0) {
            const bytesToPush = this.pendingBytesBuffer.subarray(
                startReadIndex,
                endReadIndex
            );

            this.pendingBytesReadIndex = endReadIndex;

            this.push(bytesToPush);

            if (typeof this.onBytesWritten === 'function') {
                this.onBytesWritten(bytesToPush);
            }
        }

        // If there is more data to be processed, or there is no pending data but we are
        // unthrottled, stop here

        if (
            this.pendingBytesReadIndex < this.pendingBytesCount ||
            !this.config.isThrottled
        )
            return bytesToPushLength;

        // End the request

        this.done.resolve();

        this.handleRequestStop(this);
        this.destroy();

        this.isInFlight = false;

        return bytesToPushLength;
    }

    /**
     * Informs the parent group that the throttle is no longer needed and can
     * be released. Once a throttle is destroyed, it can not be used again.
     */

    public destroy(): void {
        this.handleRequestDestroy(this);

        super.destroy();
    }

    /**
     * Invoked internally whenever data is received from the underlying
     * writeable stream. Resolves a promise when done.
     *
     * @param chunk A chunk of data in the form of a typed array of arbitrary length.
     */

    private transform(chunk: Uint8Array): void {
        if (!this.isInFlight) {
            // If this is the first chunk of data to be processed, or
            // if is processing was previously paused due to a lack of
            // input signal that the request is in flight.

            this.handleRequestStart(this);

            this.isInFlight = true;
        }

        this.pendingBytesBuffer.set(chunk, this.pendingBytesCount);

        // Copy chunk data into queue and increment total queued bytes length

        this.pendingBytesCount += chunk.length;

        // If no throttling is applied, avoid any initial latency by immediately
        // processing the queue on the next frame.

        if (!this.config.isThrottled) this.process();
    }

    /**
     * Invoked once all data has been passed to the stream, and resolving a promise
     * when all data has been processed.
     */

    private async flush(): Promise<void> {
        // If an empty request was passed through the throttle, end immediately

        if (this.pendingBytesCount === 0) return;

        if (!this.config.isThrottled) {
            // If the throttle is unbounded, then all data has been
            // processed and request can be completed

            this.handleRequestStop(this);
            this.destroy();

            this.isInFlight = false;

            return;
        }

        // Else, wait for the processing cycle to compelte the request

        return this.done;
    }
}

export default BandwidthThrottle;
