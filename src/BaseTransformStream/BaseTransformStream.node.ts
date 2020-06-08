import {Transform} from 'stream';

import IBaseTransformStreamConstructorParams from '../Interfaces/IBaseTransformStreamConstructorParams';

class BaseTransformStream extends Transform {
    constructor({transform, flush}: IBaseTransformStreamConstructorParams) {
        super({
            transform: (chunk, _, done) => {
                transform(chunk);

                done();
            },
            flush: async done => {
                await flush();

                done();
            }
        });
    }
}

export default BaseTransformStream;
