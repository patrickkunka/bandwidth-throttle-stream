import {stub, SinonStub, useFakeTimers, SinonFakeTimers} from 'sinon';
import {Readable, Writable} from 'stream';
import {assert} from 'chai';
import BandwidthThrottleGroup from './BandwidthThrottleGroup';
import Callback from './Types/Callback';

const ONE_KB = 1000;
const ONE_MB = 1000000;

const createChunkOfBytes = (bytes: number): Buffer =>
    Buffer.from([...Array(bytes)].map(() => 0x62));

interface ITestContext {
    outputStub: SinonStub<[Buffer, string, Callback]>;
    inputStream: Readable;
    outputStream: Writable;
    clock: SinonFakeTimers;
}

interface ITestCase {
    it: string;
    bytesToProcess: number;
    bytesPerSecond: number;
    expectedCompletionDurationMs: number;
}

const testCases: ITestCase[] = [
    {
        it:
            'it processes all data by the next tick, with no throttling applied',
        bytesToProcess: 100,
        bytesPerSecond: Infinity,
        expectedCompletionDurationMs: 1000 // todo - rethink "interval duration", should be `0`
    },
    {
        it: 'it throttles',
        bytesToProcess: ONE_MB,
        bytesPerSecond: ONE_KB,
        expectedCompletionDurationMs: 1000 * 1000
    }
];

const asyncIterator = {
    [Symbol.asyncIterator]: () => ({
        next: async () => ({done: false, value: null})
    })
};

describe.only('BandwidthThrottleGroup', () => {
    let context: ITestContext;

    beforeEach(() => {
        const outputStub = stub<[Buffer, string, Callback]>();

        context = {
            clock: useFakeTimers(),
            outputStub,
            inputStream: new Readable({read() {}}),
            outputStream: new Writable({write: outputStub})
        };
    });

    afterEach(() => context.clock.reset());

    testCases.forEach(testCase => {
        it(testCase.it, async () => {
            const throttleGroup = new BandwidthThrottleGroup({
                bytesPerInterval: testCase.bytesPerSecond
            });

            const throttle = throttleGroup.createBandwidthThrottle();

            let totalBytesProcessed = 0;
            let virtualTestDuration = 0;

            context.outputStub.callsFake((chunk, _, done) => {
                totalBytesProcessed += chunk.length;
                done();
            });

            context.inputStream.pipe(throttle).pipe(context.outputStream);

            const dataIn = createChunkOfBytes(testCase.bytesToProcess);

            context.inputStream.push(dataIn);

            for await (const _ of asyncIterator) {
                if (totalBytesProcessed >= testCase.bytesToProcess) break;

                const TICK_DURATION_MS = 100;

                context.clock.tick(TICK_DURATION_MS);

                virtualTestDuration += TICK_DURATION_MS;
            }

            assert.equal(
                virtualTestDuration,
                testCase.expectedCompletionDurationMs
            );
        });
    });
});
