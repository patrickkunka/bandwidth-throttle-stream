import {assert} from 'chai';

import deferred from './deferred';

describe('deferred()', () => {
    it('returns a promise that can be resolved externally', async () => {
        const promise = deferred();

        promise.resolve('foo');

        const resolvedWith = await promise;

        assert.equal(resolvedWith, 'foo');
    });

    it('returns a promise that can be rejected externally', async () => {
        const promise = deferred();

        promise.reject('foo');

        try {
            await promise;
        } catch (err) {
            assert.equal(err, 'foo');
        }
    });
});
