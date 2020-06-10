import {assert} from 'chai';

import readerToDenoReader, {
    IDenoReader
} from '../../src/Util/readerToDenoReader';

const MAX_READER_CHUNK_SIZE = 6;

interface ITestContext {
    data: number[];
    mockReader: ReadableStreamDefaultReader<Uint8Array>;
    denoReader: IDenoReader;
}

interface ITestCase {
    it: string;
    data: number[];
    pLength: number;
    maxChunkLength?: number;
    contentLegnth?: number;
    reads: Array<null | number[]>;
}

const testCases: ITestCase[] = [
    {
        it: 'it immediately returns `null` for an empty array',
        data: [],
        pLength: 6,
        reads: [null]
    },
    {
        it: 'pulls from the underlying reader into the provided array',
        data: [0, 1, 2, 3, 4, 5],
        pLength: 6,
        reads: [[0, 1, 2, 3, 4, 5], null]
    },
    {
        it: 'buffers up data when p is not sufficiently large',
        data: [0, 1, 2, 3, 4, 5],
        pLength: 3,
        reads: [[0, 1, 2], [3, 4, 5], null]
    },
    {
        it:
            'returns `null` if EOF is encountered before `contentLength` is met',
        data: [0, 1, 2],
        contentLegnth: 6,
        pLength: 6,
        reads: [[0, 1, 2], null]
    },
    {
        it: 'processes data as it is provided',
        data: [0, 1, 2, 3, 4, 5, 6, 7, 8],
        pLength: 6,
        reads: [[0, 1, 2, 3, 4, 5], [6, 7, 8], null, null]
    }
];

const createMockData = (values: number[]) => {
    const arr = new Uint8Array(values.length);

    arr.set(values);

    return arr;
};

const createMockReader = (
    data: number[]
): ReadableStreamDefaultReader<Uint8Array> => {
    let readStartIndex = 0;

    return {
        read: async () => {
            const chunkLength = Math.min(MAX_READER_CHUNK_SIZE, data.length);
            const readEndIndex = Math.min(
                readStartIndex + chunkLength,
                data.length
            );
            const value = createMockData(data).subarray(
                readStartIndex,
                readEndIndex
            );

            const returnValue =
                value.length > 0
                    ? {
                          value,
                          done: false
                      }
                    : ({
                          value: undefined,
                          done: true
                      } as any);

            readStartIndex = readEndIndex;

            return returnValue;
        },
        cancel: () => Promise.resolve(),
        closed: Promise.resolve(),
        releaseLock: () => void 0
    };
};

describe('readerToDenoReader()', () => {
    let context: ITestContext;

    testCases.forEach(testCase => {
        it(testCase.it, async () => {
            const mockReader = createMockReader(testCase.data);

            context = {
                data: testCase.data,
                mockReader,
                denoReader: readerToDenoReader(
                    mockReader,
                    testCase.contentLegnth ?? testCase.data.length
                )
            };

            const p = new Uint8Array(testCase.pLength);

            for (const expected of testCase.reads) {
                const result = await context.denoReader.read(p);

                if (expected) {
                    assert.equal(result, expected.length);

                    assert.deepEqual(
                        Array.from(p.subarray(0, result!)),
                        expected
                    );
                } else {
                    assert.isNull(result);
                }
            }
        });
    });
});
