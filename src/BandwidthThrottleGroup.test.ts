import {stub, SinonStub, useFakeTimers, SinonFakeTimers} from 'sinon';
import {Readable, Writable} from 'stream';
import {assert} from 'chai';
import BandwidthThrottleGroup from './BandwidthThrottleGroup';
import Callback from './Types/Callback';

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
    expectedCompletionDurationSeconds: number;
}

const testCases: ITestCase[] = [
    {
        it:
            'it processes all data by the next tick, with no throttling applied',
        bytesToProcess: 100,
        bytesPerSecond: Infinity,
        expectedCompletionDurationSeconds: 0
    },
    {
        it: 'completes processing of throttled data in the expected time',
        bytesToProcess: 500,
        bytesPerSecond: 50,
        expectedCompletionDurationSeconds: 10
    }
];

const TEST_RUNNER_TICK_DURATION = 100;

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

    afterEach(() => context.clock.uninstall());

    it(
        'should destroy attached throttle instances on request end, so ' +
            'that they cannot be reused',
        async () => {
            const throttleGroup = new BandwidthThrottleGroup();
            const throttle = throttleGroup.createBandwidthThrottle();
            const buffer = createChunkOfBytes(100);

            await new Promise(resolve => {
                throttle.on('data', () => void 0).on('end', resolve);

                throttle.write(buffer);
                throttle.end();
            });

            assert.throws(() => throttle.write(buffer), Error);
        }
    );

    testCases.forEach(testCase => {
        it(testCase.it, async () => {
            const throttleGroup = new BandwidthThrottleGroup({
                bytesPerSecond: testCase.bytesPerSecond
            });

            const throttle = throttleGroup.createBandwidthThrottle();

            let totalBytesProcessed = 0;
            let virtualTestDuration = 0;

            context.outputStub.callsFake((chunk, _, done) => {
                totalBytesProcessed += chunk.length;

                done();

                if (totalBytesProcessed < testCase.bytesToProcess) return;

                assert.equal(
                    virtualTestDuration / 1000,
                    testCase.expectedCompletionDurationSeconds
                );
            });

            context.inputStream.pipe(throttle).pipe(context.outputStream);

            const dataIn = createChunkOfBytes(testCase.bytesToProcess);

            context.inputStream.push(dataIn);

            while (totalBytesProcessed < testCase.bytesToProcess) {
                await Promise.resolve();

                virtualTestDuration += TEST_RUNNER_TICK_DURATION;

                context.clock.tick(TEST_RUNNER_TICK_DURATION);
            }
        });
    });
});
