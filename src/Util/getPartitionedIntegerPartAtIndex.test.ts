import {assert} from 'chai';

import getPartitionedIntegerPartAtIndex from './getPartitionedIntegerPartAtIndex';

interface ITestCase {
    value: number;
    partsCount: number;
    expected: number[];
}

const testCases: ITestCase[] = [
    {
        value: 1,
        partsCount: 1,
        expected: [1]
    },
    {
        value: 10,
        partsCount: 2,
        expected: [5, 5]
    },
    {
        value: 9,
        partsCount: 3,
        expected: [3, 3, 3]
    },
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
    },
    {
        value: 50,
        partsCount: 80,
        expected: [
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1,
            0
        ]
    }
];

describe.only('getPartitionedIntegerPartAtIndex()', () => {
    testCases.forEach((testCase, testCaseIndex) => {
        it(`should pass test case ${testCaseIndex}`, () => {
            const sum = testCase.expected.reduce(
                (sumUnderConstruction, expectedPart, i) => {
                    const part = getPartitionedIntegerPartAtIndex(
                        testCase.value,
                        testCase.partsCount,
                        i
                    );

                    assert.equal(
                        part,
                        expectedPart,
                        `expected part with value ${part} at index ${i} to equal ${expectedPart}`
                    );

                    return part + sumUnderConstruction;
                },
                0
            );

            assert.equal(sum, testCase.value);
        });
    });
});
