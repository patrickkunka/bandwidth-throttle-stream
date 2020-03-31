import partitionInteger from './partitionInteger';
import {assert} from 'chai';

interface ITestCase {
    value: number;
    partsCount: number;
    expected: number[];
}

const testCases: ITestCase[] = [
    {
        value: 10,
        partsCount: 15,
        expected: [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1]
    },
    {
        value: 20,
        partsCount: 15,
        expected: [2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1]
    },
    {
        value: 4,
        partsCount: 15,
        expected: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0]
    },
    {
        value: 100,
        partsCount: 15,
        expected: [6, 7, 7, 6, 7, 7, 6, 7, 7, 6, 7, 7, 6, 7, 7]
    },
    {
        value: 1,
        partsCount: 17,
        expected: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
        value: 50,
        partsCount: 40,
        expected: [
            2,
            1,
            1,
            1,
            2,
            1,
            1,
            1,
            2,
            1,
            1,
            1,
            2,
            1,
            1,
            1,
            2,
            1,
            1,
            1,
            2,
            1,
            1,
            1,
            2,
            1,
            1,
            1,
            2,
            1,
            1,
            1,
            2,
            1,
            1,
            1,
            2,
            1,
            1,
            1
        ]
    }
];

describe.only('partitionInteger()', () => {
    testCases.forEach((testCase, i) => {
        it(`should pass test case ${i}`, () => {
            const output = partitionInteger(
                testCase.value,
                testCase.partsCount
            );
            const sum = output.reduce((sum, item) => sum + item, 0);

            assert.equal(sum, testCase.value);
            assert.deepEqual(output, testCase.expected);
        });
    });
});
