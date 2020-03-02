import {Transform} from 'stream';

import ICurrentBandwidthThrottleOptions from './Interfaces/ICurrentBandwidthThrottleOptions';
import Callback from './Types/Callback';
import RequestEndCallback from './Types/RequestEndCallback';

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

    private intervalId: NodeJS.Timeout;
    private lastPushTime = -1;
    private pendingBytesQueue: number[] = [];
    private options: ICurrentBandwidthThrottleOptions;
    private isInFlight: boolean = false;
    private handleRequestStart: Callback;
    private handleRequestEnd: RequestEndCallback;

    constructor(
        /**
         * An object of configuration values provided by the
         * parent group.
         */

        options: ICurrentBandwidthThrottleOptions,

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

        this.intervalId = this.createBytesProcessingInterval();
    }

    /**
     * Overwrites the derived class's `_transform` method, which is
     * invoked internally whenever data is received from the underlying
     * writeable stream.
     *
     * @param chunk A chunk of data in the form of a buffer of arbitary length.
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

        if (
            this.pendingBytesQueue.length >=
            this.options.bytesPerInterval * 2
        ) {
            // If the queue contains has more chunks than can be processed
            // in a single interval, let it clear before signalling that
            // additional input can be received.

            setTimeout(done, this.options.intervalDurationMs);

            return;
        }

        done();
    }

    /**
     * Overwrites the derived class's `_flush` method, which is
     * invoked internally when the final piece of data has been received
     * by the underlying writable stream.
     *
     * @param done A callback to be done once all data has been pushed
     *  to the underlying readable stream.
     */

    public _flush(done: Callback): void {
        // Data has been written, re-run the interval until all queued chunks have
        // been pushed, then call `done()`

        clearInterval(this.intervalId);

        this.intervalId = this.createBytesProcessingInterval(() => {
            this.handleRequestEnd(this);

            done();
        });
    }

    /**
     * Ensures any running intervals are terminated so that the
     * instance can be garbage collected.
     */

    public destroy(): void {
        clearInterval(this.intervalId);
    }

    /**
     * To be called when the request being throttled is aborted in
     * order to rebalance the available bandwidth.
     */

    public abort(): void {
        this.handleRequestEnd(this);
    }

    /**
     * Creates an interval at the defined duration, used to monitor
     * throughput (via the pending bytes queue) and ensure only the maximum
     * defined amount of data is pushed to the underlying readable stream once
     * per iteration.
     *
     * @param done A callback to invoked once all data has been processed
     *  and the queue is empty.
     */

    private createBytesProcessingInterval(done?: Callback): NodeJS.Timeout {
        // If no throttling is applied, avoid any initial latency by immediately
        // processing the queue on the next frame.

        if (this.options.bytesPerInterval === Infinity)
            setTimeout(this.processQueuedBytes.bind(this, done), 0);

        return setInterval(
            () => this.processQueuedBytes(done),
            // NB: We iterate at a rate 10x faster than interval provided.
            // This ensures greater accuracy of throttling and forces the
            // throttling to stay in sync, should the JavaScript timer become
            // delayed due to other thread-blocking processes.
            this.options.intervalDurationMs / 10
        );
    }

    private processQueuedBytes(done?: Callback): void {
        // Record the time since data was last passed to the
        // readable stream

        const elapsedTime = Date.now() - this.lastPushTime;

        // If the time elapsed is less than the provided interval
        // duration, do nothing.

        if (elapsedTime < this.options.intervalDurationMs) return;

        // If there are chunks waiting in the queue, collect the
        // amount bytes specified, and push them to the readable
        // stream

        if (this.pendingBytesQueue.length > 0) {
            const bytesToPush = Buffer.from(
                this.pendingBytesQueue.splice(
                    0,
                    this.options.bytesPerIntervalPerRequest
                )
            );

            // console.log(`[BandwidthThrottle] Time since last data push ${elapsedTime}`);

            this.push(bytesToPush);

            if (typeof this.onBytesWritten === 'function')
                this.onBytesWritten();

            // Increment the last push time, and return

            this.lastPushTime += elapsedTime;

            return;
        }

        // Else, queue is empty, stop the interval

        clearInterval(this.intervalId);

        // If a `done` callback has been provided, call it

        if (done) done();
    }
}

export default BandwidthThrottle;
