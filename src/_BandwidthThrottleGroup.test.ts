import {stub, SinonStub} from 'sinon';

import {Transform, Readable, Writable} from 'stream';
import Callback from './Types/Callback';
import {assert} from 'chai';

class MyTransform extends Transform {
    public _transform(chunk: Buffer, _, done: Callback): void {
        this.push(chunk);

        done();
    }
}

const createChunkOfBytes = (bytes: number): Buffer =>
    Buffer.from([...Array(bytes)].map(() => 0x62));

interface ITestContext {
    outputStub: SinonStub<[Buffer]>;
    inputStream: Readable;
    outputStream: Writable;
}

describe.only('BandwidthThrottleGroup', () => {
    let context: ITestContext;

    beforeEach(() => {
        const outputStub = stub<[Buffer]>();

        context = {
            outputStub,
            inputStream: new Readable({
                read() {}
            }),
            outputStream: new Writable({
                write: outputStub
            })
        };
    });

    it('should receive incoming data', async () => {
        const transform = new MyTransform();

        context.inputStream.pipe(transform).pipe(context.outputStream);

        const dataIn = createChunkOfBytes(100);

        context.inputStream.push(dataIn);

        await Promise.resolve();

        assert(context.outputStub.called);

        const [dataOut] = context.outputStub.lastCall.args;

        assert.equal(dataIn, dataOut);
    });
});
