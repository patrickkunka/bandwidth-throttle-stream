import {assert} from 'chai';

import divideIntegerIntoWholeParts from '../../src/Util/divideIntegerIntoWholeParts';

type TCountValueSet = [number, number];

interface ITestCase {
    value: number;
    partsCount: number;
    expected: [TCountValueSet, TCountValueSet];
}

const testCases: ITestCase[] = [
    {
        value: 1,
        partsCount: 1,
        expected: [
            [1, 1],
            [0, 0]
        ]
    },
    {
        value: 10,
        partsCount: 2,
        expected: [
            [2, 5],
            [0, 0]
        ]
    },
    {
        value: 9,
        partsCount: 2,
        expected: [
            [1, 4],
            [1, 5]
        ]
    },
    {
        value: 3,
        partsCount: 10,
        expected: [
            [7, 0],
            [3, 1]
        ]
    }
];

describe('divideIntegerIntoWholeParts()', () => {
    testCases.forEach((testCase, testCaseIndex) => {
        it(`should pass test case ${testCaseIndex}`, () => {
            const output = divideIntegerIntoWholeParts(
                testCase.value,
                testCase.partsCount
            );

            assert.deepEqual(output, testCase.expected);
        });
    });
});
