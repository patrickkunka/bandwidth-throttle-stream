/**
 * Converts a W3C `ReadableStreamDefaultReader` into a `Deno.Reader`.
 *
 * Implements a constrained buffer to handle backpressure.
 *
 * @param reader The `ReadableStreamDefaultReader` to read from.
 * @param contentLength The total number of bytes in the request to be
 *    passed through the reader. Used to allocate required buffer memory.
 */

interface IDenoReader {
    read: (p: Uint8Array) => Promise<number | null>;
}

const readerToDenoReader = (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    contentLength: number
): IDenoReader => {
    const buffer = new Uint8Array(contentLength);

    let bufferEndIndex = 0;
    let bufferReadStartIndex = 0;

    return {
        read: async (p: Uint8Array) => {
            // If `0` contentLength has been passed (indicating an empty request), return
            // `null` immediately

            if (!contentLength) return null;

            // Once all data has been read out of the buffer, return `null` to
            // signal EOF

            if (bufferReadStartIndex > contentLength - 1) return null;

            const {value} = await reader.read();

            if (value) {
                // Push value into buffer

                buffer.set(value, bufferEndIndex);

                bufferEndIndex += value.length;
            }

            // If all buffered data has been written after at least one call to `.read()`
            // (regardless of content length), return `null` early. This could indicate
            // a value for `contentLength` that is too large.

            if (bufferReadStartIndex === bufferEndIndex) return null;

            // Create a view of the buffer to read out, no larger than `p.length`

            const maxReadableLength = p.length;

            const bufferReadEndIndex = Math.min(
                bufferReadStartIndex + maxReadableLength,
                bufferEndIndex
            );

            const bufferReadView = buffer.subarray(
                bufferReadStartIndex,
                bufferReadEndIndex
            );

            p.set(bufferReadView);

            bufferReadStartIndex = bufferReadEndIndex;

            // Return the length of data pushed into `p`.

            return bufferReadView.length;
        }
    };
};

export {readerToDenoReader as default, IDenoReader};
