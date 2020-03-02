import {assert} from 'chai';

import BandwidthThrottleGroup from './BandwidthThrottleGroup';

interface IThrottleTestCase {
    /**
     * The number of active throttles during the test
     */

    throttlesCount: number;

    /**
     * The number of times the interval should be allowed to elapse.
     */

    iterations: number;

    /**
     * The throttle group's `intervalDurationMs` value.
     */

    intervalDurationMs: number;

    /**
     * The throttle group's `bytesPerInterval` value.
     */

    bytesPerInterval: number[];

    /**
     * The amount of data (in bytes) to pipe into the throttle for
     * the test.
     */

    bytesToProcess: number;

    /**
     * The amount of data (in bytes) we expect to be processed for each
     * iteration of the interval.
     */

    expectedBytesProcessedAtInterval: number[];
}

const ONE_KB = 1000;
const ONE_MB = 1000000;

const createChunkOfBytes = (bytes: number): Buffer =>
    Buffer.from([...Array(bytes)].map(() => 0x62));

const throttleTestCases: IThrottleTestCase[] = [
    {
        throttlesCount: 1,
        iterations: 1,
        intervalDurationMs: 100,
        bytesPerInterval: [Infinity],
        bytesToProcess: ONE_MB,
        expectedBytesProcessedAtInterval: [ONE_MB]
    },
    {
        throttlesCount: 1,
        iterations: 2,
        intervalDurationMs: 100,
        bytesPerInterval: [5000],
        bytesToProcess: ONE_MB,
        expectedBytesProcessedAtInterval: [5000]
    },
    {
        throttlesCount: 1,
        iterations: 5,
        intervalDurationMs: 100,
        bytesPerInterval: [100],
        bytesToProcess: ONE_MB,
        expectedBytesProcessedAtInterval: [100]
    },
    {
        throttlesCount: 1,
        iterations: 5,
        intervalDurationMs: 100,
        bytesPerInterval: [2000],
        bytesToProcess: ONE_KB,
        expectedBytesProcessedAtInterval: [1000, 0, 0, 0, 0]
    },
    {
        throttlesCount: 1,
        iterations: 6,
        intervalDurationMs: 100,
        bytesPerInterval: [100, 100, 50, 50, 200, 200],
        bytesToProcess: ONE_MB,
        expectedBytesProcessedAtInterval: [100, 100, 50, 50, 200, 200]
    },
    {
        throttlesCount: 2,
        iterations: 6,
        intervalDurationMs: 100,
        bytesPerInterval: [100, 100, 50, 50, 200, 200],
        bytesToProcess: ONE_MB,
        expectedBytesProcessedAtInterval: [100, 100, 50, 50, 200, 200]
    }
];

const handleTestCase = async (testCase: IThrottleTestCase) => {
    const {
        throttlesCount: throttles,
        bytesPerInterval,
        bytesToProcess,
        iterations,
        intervalDurationMs
    } = testCase;

    const testDurationMs = iterations * intervalDurationMs;
    const initialBytesPerInterval = bytesPerInterval[0];

    const throttleGroup = new BandwidthThrottleGroup({
        bytesPerInterval: initialBytesPerInterval,
        intervalDurationMs
    });

    const buffer = createChunkOfBytes(bytesToProcess);

    Array(throttles)
        .fill(null)
        .forEach(async (_, throttleIndex) =>
            testIndividualThrottle(
                buffer,
                throttleGroup,
                testCase,
                throttleIndex
            )
        );

    await new Promise(resolve => setTimeout(resolve, testDurationMs));

    throttleGroup.destroy();
};

const testIndividualThrottle = async (
    buffer: Buffer,
    throttleGroup: BandwidthThrottleGroup,
    testCase: IThrottleTestCase,
    throttleIndex: number
) => {
    const {
        throttlesCount,
        bytesPerInterval,
        expectedBytesProcessedAtInterval
    } = testCase;

    const throttle = throttleGroup.createBandwidthThrottle();

    let totalBytesProcessed = 0;

    throttle.on('data', chunk => {
        totalBytesProcessed += chunk.length;
    });

    throttle.write(buffer);
    throttle.end();

    let lastBytesRead = totalBytesProcessed;
    let intervalCount = 0;

    throttle.onBytesWritten = () => {
        const bytesProcessedSinceLastRead = totalBytesProcessed - lastBytesRead;

        lastBytesRead = totalBytesProcessed;

        const expectedBytesProcessed =
            expectedBytesProcessedAtInterval[intervalCount];

        if (typeof expectedBytesProcessed === 'number') {
            assert.equal(
                bytesProcessedSinceLastRead,
                expectedBytesProcessed / throttlesCount
            );
        }

        intervalCount++;

        if (
            throttleIndex === throttlesCount - 1 &&
            typeof bytesPerInterval[intervalCount] === 'number'
        ) {
            setTimeout(
                () =>
                    throttleGroup.setBytesPerInterval(
                        bytesPerInterval[intervalCount]
                    ),
                0
            );
        }
    };
};

describe('BandwidthThrottleGroup', () => {
    it('should fallback to a default of a 1 second interval if not provided', () => {
        const throttleGroup = new BandwidthThrottleGroup({
            bytesPerInterval: 22
        });

        assert.equal(throttleGroup.options.intervalDurationMs, 1000);
    });

    it('should take all configuration options provided', () => {
        const throttleGroup = new BandwidthThrottleGroup({
            bytesPerInterval: 22,
            intervalDurationMs: 100
        });

        assert.equal(throttleGroup.options.bytesPerInterval, 22);
        assert.equal(throttleGroup.options.intervalDurationMs, 100);
    });

    it(
        'should destroy attached throttle instances on request end, so ' +
            'that they cannot be reused',
        async () => {
            const throttleGroup = new BandwidthThrottleGroup({
                bytesPerInterval: Infinity,
                intervalDurationMs: 100
            });

            const throttle = throttleGroup.createBandwidthThrottle();
            const buffer = createChunkOfBytes(100);

            await new Promise(resolve => {
                throttle.on('data', () => void 0).on('end', () => resolve());

                throttle.write(buffer);
                throttle.end();
            });

            assert.throws(() => throttle.write(buffer), Error);
        }
    );

    throttleTestCases.forEach((testCase: IThrottleTestCase, i) => {
        it(`should pass test case ${i}`, async () => handleTestCase(testCase));
    });
});
