import {Transform} from 'stream';

import Callback from './Types/Callback';
import RequestEndCallback from './Types/RequestEndCallback';
import IBandwidthThrottleOptions from './Interfaces/IBandwidthThrottleOptions';

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

class BandwidthThrottle extends Transform {
    /**
     * A callback to be invoked when bytes are written
     * to the underlying `readable` stream. Used as a hook
     * for testing to confirm output rate.
     */

    public onBytesWritten: Callback | null = null;
    public id = '';

    private pendingBytesQueue: number[] = [];
    private options: Readonly<IBandwidthThrottleOptions>;
    private isInFlight: boolean = false;
    private handleRequestStart: Callback;
    private handleRequestEnd: RequestEndCallback;
    private transformCallback: Callback | null = null;
    private flushCallback: Callback | null = null;

    constructor(
        /**
         * An object of configuration values provided by the
         * parent group.
         */

        options: Readonly<IBandwidthThrottleOptions>,

        /**
         * A handler to be invoked whenever a request starts, so that
         * the parent group can increment of the total number of
         * requests in flight across the group.
         */

        handleRequestStart: Callback,

        /**
         * A handler to be invoked whenever a request ends, so that
         * the parent group can decrement of the total number of
         * requests in flight across the group.
         */

        handleRequestEnd: RequestEndCallback,

        /**
         * A unique ID for the throttle, for debugging purposes.
         */

        id: string = ''
    ) {
        super();

        this.options = options;
        this.handleRequestStart = handleRequestStart;
        this.handleRequestEnd = handleRequestEnd;
        this.id = id;
    }

    /**
     * Overwrites the derived class's `_transform` method, which is
     * invoked internally whenever data is received from the underlying
     * writeable stream.
     *
     * @param chunk A chunk of data in the form of a buffer of arbitrary length.
     * @param _ The type of encoding (not used)
     * @param done A callback to be invoked once the incoming data has been processed.
     */

    public _transform(chunk: Buffer, _, done: Callback): void {
        if (!this.isInFlight) {
            // If this is the first chunk for the throttle instance,
            // signal that the request has started.

            this.handleRequestStart();

            this.isInFlight = true;
        }

        // Iterate through and each byte of the incoming chunk, and push
        // each one into the queue

        for (const byte of chunk) {
            this.pendingBytesQueue.push(byte);
        }

        // If no throttling is applied, avoid any initial latency by immediately
        // processing the queue on the next frame.

        if (this.options.bytesPerSecond === Infinity) {
            this.process();

            done();

            return;
        }

        this.transformCallback = done;
    }

    /**
     * Overwrites the derived class's `_flush` method, which is
     * invoked internally when the final piece of data has been received
     * by the underlying writable stream.
     *
     * @param done A callback to be invoked once all data has been pushed
     *  to the underlying readable stream.
     */

    public _flush(done: Callback): void {
        if (this.options.bytesPerSecond === Infinity) {
            this.handleRequestEnd(this);

            done();

            return;
        }

        // Else, wait until all pending data processed then call flush done

        this.flushCallback = done;
    }

    /**
     * To be called when the request being throttled is aborted in
     * order to rebalance the available bandwidth.
     */

    public abort(): void {
        this.handleRequestEnd(this);
    }

    public process(maxBytesToProcess: number = Infinity): void {
        const bytesToPush = Buffer.from(
            this.pendingBytesQueue.splice(0, maxBytesToProcess)
        );

        this.push(bytesToPush);

        if (typeof this.onBytesWritten === 'function') this.onBytesWritten();

        // If there is more data to be processed, stop here

        if (this.pendingBytesQueue.length > 0 || !this.transformCallback)
            return;

        // If a `transform` callback has been provided, call it

        this.transformCallback();

        this.transformCallback = null;

        if (!this.flushCallback) return;

        // If the writing of data has ended and flush has already been
        // called, invoke the flush callback and signal request end

        this.flushCallback();

        this.handleRequestEnd(this);
    }
}

export default BandwidthThrottle;
