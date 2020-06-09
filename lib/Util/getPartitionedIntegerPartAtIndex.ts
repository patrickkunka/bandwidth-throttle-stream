import divideIntegerIntoWholeParts from './divideIntegerIntoWholeParts.ts';
import evenlyDistributeSets from './evenlyDistributeSets.ts';

/**
 * Returns a whole integer value of an evenly divided and evenly distributed part
 * of an integer `value`, at index `index` of `partsCount`.
 *
 * When an integer can not be divided evenly into n `parts`, it will be broken down unevenly
 * into parts of value "a" or "b", differing in value by at most 1. Depending on the index
 * provided therefore, either value "a" or "b" will be returned.
 *
 * @param value The value to be evenly divided
 * @param partsCount The number of whole parts to divide the integer into.
 * @param index The index of the part whose value is to be returned.
 */

const getPartitionedIntegerPartAtIndex = (
    value: number,
    partsCount: number,
    index: number
): number => {
    const [setA, setB] = divideIntegerIntoWholeParts(value, partsCount);

    return evenlyDistributeSets(setA, setB, index);
};

export default getPartitionedIntegerPartAtIndex;
