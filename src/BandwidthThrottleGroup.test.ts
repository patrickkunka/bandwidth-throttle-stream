import {assert} from 'chai';
import {SinonFakeTimers, SinonStub, stub, useFakeTimers} from 'sinon';
import {Readable, Writable} from 'stream';

import BandwidthThrottle from './BandwidthThrottle';
import createBandwidthThrottleGroup from './createBandwidthThrottleGroup';
import Callback from './Types/Callback';

const createChunkOfBytes = (bytes: number): Buffer =>
    Buffer.from([...Array(bytes)].map(() => 0x62));

interface ITestContext {
    clock: SinonFakeTimers;
}

interface IRequestContext {
    outputStub: SinonStub<[Buffer, string, Callback], void>;
    inputStream: Readable;
    outputStream: Writable;
    totalTicks: number;
    startTick: number;
    endTick: number;
    endTime: number;
    timeline: string;
    bytes: number;
    throttle: BandwidthThrottle;
}

interface ITestCase {
    bytesPerSecond: number;
    tickIntervalMs: number;
    requests: Array<{timeline: string; bytes: number}>;
}

const testCases: ITestCase[] = [
    {
        tickIntervalMs: 1000,
        bytesPerSecond: Infinity,
        requests: [{timeline: '', bytes: 100}]
    },
    {
        tickIntervalMs: 1000,
        bytesPerSecond: 50,
        requests: [{timeline: '==========', bytes: 500}]
    },
    {
        tickIntervalMs: 1000,
        bytesPerSecond: 50,
        requests: [
            {timeline: '======', bytes: 150},
            {timeline: '======', bytes: 150}
        ]
    },
    {
        tickIntervalMs: 1000,
        bytesPerSecond: 100,
        requests: [
            {timeline: '====    ', bytes: 400},
            {timeline: '    ====', bytes: 400}
        ]
    },
    {
        tickIntervalMs: 1000,
        bytesPerSecond: 100,
        requests: [
            {timeline: '============', bytes: 800},
            {timeline: '    ========', bytes: 400}
        ]
    },
    {
        tickIntervalMs: 1000,
        bytesPerSecond: 100,
        requests: [
            {timeline: '============    ', bytes: 800},
            {timeline: '    ============', bytes: 800}
        ]
    },
    {
        tickIntervalMs: 1000,
        bytesPerSecond: 100,
        requests: [
            {timeline: '================', bytes: 1200},
            {timeline: '    ========    ', bytes: 400}
        ]
    },
    {
        tickIntervalMs: 1000,
        bytesPerSecond: 1000,
        requests: [
            {timeline: '==  ', bytes: 1500},
            {timeline: ' == ', bytes: 1000},
            {timeline: '  ==', bytes: 1500}
        ]
    },
    {
        tickIntervalMs: 1000,
        bytesPerSecond: 900,
        requests: [
            {timeline: '======', bytes: 3600},
            {timeline: '   ===', bytes: 900},
            {timeline: '   ===', bytes: 900}
        ]
    }
];

describe('BandwidthThrottleGroup', () => {
    let context: ITestContext;

    beforeEach(() => {
        context = {
            clock: useFakeTimers()
        };
    });

    afterEach(() => context.clock.uninstall());

    it(
        'should destroy attached throttle instances on request end, so ' +
            'that they cannot be reused',
        async () => {
            const throttleGroup = createBandwidthThrottleGroup();
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

    testCases.forEach((testCase, testCaseIndex) => {
        it(`should pass test case ${testCaseIndex}`, async () => {
            const throttleGroup = createBandwidthThrottleGroup({
                bytesPerSecond: testCase.bytesPerSecond
            });

            const requestContexts = testCase.requests.map(
                (request, requestIndex) => {
                    let bytesProcessed = 0;

                    const outputStub = stub<
                        [Buffer, string, Callback],
                        void
                    >().callsFake((bytes, _, done) => {
                        bytesProcessed += bytes.length;

                        if (bytesProcessed === request.bytes) {
                            requestContext.endTime = Date.now();
                        }

                        done();
                    });

                    const totalTicks = request.timeline.length;
                    const startTick = Math.max(
                        0,
                        request.timeline.indexOf('=')
                    );
                    const endTick = request.timeline.lastIndexOf('=') + 1;
                    const throttle = throttleGroup.createBandwidthThrottle();
                    const inputStream = new Readable({read: () => void 0});
                    const outputStream = new Writable({write: outputStub});

                    inputStream.pipe(throttle).pipe(outputStream);

                    const requestContext: IRequestContext = {
                        bytes: request.bytes,
                        inputStream,
                        outputStream,
                        outputStub,
                        startTick,
                        endTick,
                        endTime: -1,
                        totalTicks,
                        throttle,
                        timeline: request.timeline
                    };

                    return requestContext;
                }
            );

            const maxTicks = Math.max(
                ...requestContexts.map(({totalTicks}) => totalTicks)
            );
            const testDurationMs = maxTicks * testCase.tickIntervalMs;

            let tickIndex = 0;

            do {
                requestContexts.forEach((aRequestContext, requestIndex) => {
                    if (aRequestContext.startTick === tickIndex) {
                        // Data write start

                        const dataIn = createChunkOfBytes(
                            aRequestContext.bytes
                        );

                        aRequestContext.inputStream.push(dataIn);
                    }
                });

                await Promise.resolve();

                if (tickIndex < maxTicks) {
                    // Only tick the clock if there are further iterations to be completed

                    context.clock.tick(testCase.tickIntervalMs);
                }

                tickIndex++;
            } while (tickIndex < maxTicks);

            assert.equal(Date.now(), testDurationMs);

            requestContexts.forEach((aRequestContext, requestIndex) => {
                assert(aRequestContext.outputStub.called);

                assert.isAtMost(
                    aRequestContext.endTime,
                    aRequestContext.endTick * testCase.tickIntervalMs,
                    `expected request ${requestIndex} to complete within ${aRequestContext.endTick *
                        testCase.tickIntervalMs}ms`
                );

                // Allow requests to finish early
                // (if bytes must be sparsely distributed)

                assert.isAtLeast(
                    aRequestContext.endTime,
                    aRequestContext.endTick * testCase.tickIntervalMs -
                        throttleGroup.config.tickDurationMs,
                    `expected request ${requestIndex} to complete within ${aRequestContext.endTick *
                        testCase.tickIntervalMs}ms`
                );
            });
        });
    });
});
