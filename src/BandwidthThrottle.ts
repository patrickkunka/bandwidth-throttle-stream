import {Transform} from 'stream';

import Config from './Config';
import Callback from './Types/Callback';
import CallbackWithSelf from './Types/CallbackWithSelf';

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

    public onBytesWritten: ((chunk: Buffer) => void) | null = null;
    public id = '';

    private pendingBytesQueue: number[] = [];
    private config: Readonly<Config>;
    private isInFlight: boolean = false;
    private handleRequestStart: CallbackWithSelf;
    private handleRequestStop: CallbackWithSelf;
    private handleRequestDestroy: CallbackWithSelf;
    private transformCallbacks: Callback[] = [];

    constructor(
        /**
         * An object of configuration values provided by the
         * parent group.
         */

        config: Readonly<Config>,

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

        handleRequestDestroy: CallbackWithSelf,

        /**
         * A unique ID for the throttle, for debugging purposes.
         */

        id: string = ''
    ) {
        super();

        this.config = config;
        this.handleRequestStart = handleRequestStart;
        this.handleRequestStop = handleRequestEnd;
        this.handleRequestDestroy = handleRequestDestroy;
        this.id = id;
    }

    /**
     * Informs the parent group that the throttle is no longer needed and can
     * be released.
     */

    public destroy(): void {
        super.destroy();

        this.handleRequestDestroy(this);
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
            // If this is the first chunk of data to be processed, or
            // if is processing was previously paused due to a lack of
            // input signal that the request is in flight.

            this.handleRequestStart(this);

            this.isInFlight = true;
        }

        // Iterate through and each byte of the incoming chunk, and push
        // each one into the queue

        for (const byte of chunk) {
            this.pendingBytesQueue.push(byte);
        }

        // If no throttling is applied, avoid any initial latency by immediately
        // processing the queue on the next frame.

        if (!this.config.isThrottled) {
            this.process();

            done();

            return;
        }

        this.transformCallbacks.push(done);
    }

    /**
     * To be called when the request being throttled is aborted in
     * order to rebalance the available bandwidth.
     */

    public abort(): void {
        this.handleRequestStop(this);
        this.handleRequestDestroy(this);
    }

    /**
     * Extracts a number of bytes from the pending bytes queue and
     * pushes it out to a piped writable stream.
     */

    public process(maxBytesToProcess: number = Infinity): void {
        const bytesToPush = Buffer.from(
            this.pendingBytesQueue.splice(0, maxBytesToProcess)
        );

        this.push(bytesToPush);

        if (typeof this.onBytesWritten === 'function')
            this.onBytesWritten(bytesToPush);

        // If there is more data to be processed, stop here

        if (this.pendingBytesQueue.length > 0) return;

        // No data left to be processed, call the first
        // callback in the queue

        if (this.transformCallbacks.length > 0)
            this.transformCallbacks.shift()!();

        // This may result in other queued data being passed to
        // `_transform`, and other callbacks being pushed.

        if (this.transformCallbacks.length > 0) return;

        // If there are no other callbacks at this point
        // we can consider the request inactive.

        this.handleRequestStop(this);

        this.isInFlight = false;
    }
}

export default BandwidthThrottle;
