import {assert} from 'chai';

import readerToDenoReader, {
    IDenoReader
} from '../../src/Util/readerToDenoReader';

interface ITestContext {
    data: number[];
    mockReader: ReadableStreamDefaultReader<Uint8Array>;
    denoReader: IDenoReader;
}

interface ITestCase {
    it: string;
    data: number[];
    reads: Array<null | number[]>;
    pLength: number;
}

const testCases: ITestCase[] = [
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
    let readIndex = 0;

    return {
        read: async () => {
            const value = createMockData(data).subarray(readIndex, data.length);

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

            readIndex += data.length;

            return returnValue;
        },
        cancel: () => Promise.resolve(),
        closed: Promise.resolve(),
        releaseLock: () => void 0
    };
};

describe('readerToDenoReader()', () => {
    let context: ITestContext;

    beforeEach(() => {
        const data = [];
        const mockReader = createMockReader(data);

        context = {
            data,
            mockReader,
            denoReader: readerToDenoReader(mockReader, 6)
        };
    });

    testCases.forEach(testCase => {
        it(testCase.it, async () => {
            context.data.push(...testCase.data);

            const p = new Uint8Array(testCase.pLength);

            for (const expected of testCase.reads) {
                const result = await context.denoReader.read(p);

                if (expected) {
                    assert.equal(result, expected.length);

                    assert.deepEqual(
                        Array.from(p.subarray(0, context.data.length)),
                        expected
                    );
                } else {
                    assert.isNull(result);
                }
            }
        });
    });
});
