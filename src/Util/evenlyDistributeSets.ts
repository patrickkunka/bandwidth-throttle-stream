// @deno-types="./evenlyDistributeSets.d.ts"

/**
 * Evenly distributes two sets of integers with the goal of
 * ensuring the highest distance between each occurence
 * of the same integer.
 *
 * @param setA A virtual set of integers all of value "a", expressed as a tuple of [count, value]
 * @param setB A virtual set of integers all of value "b", expressed as a tuple of [count, value]
 * @param lookupIndex
 *  An index at which to retrieve a value from a (virtual) set
 *  in which values "a" and "b" are evenly distributed.
 */

const evenlyDistributeSets = (
    setA: [number, number],
    setB: [number, number],
    lookupIndex: number
): number => {
    // Find the set with the lower count (lesser occuring)

    const [lessCommonSet, moreCommonSet] = [setA, setB].sort(
        (a, b) => a[0] - b[0]
    );

    // If one of the sets is empty, all values will be equal, so return the
    // common value.

    if (lessCommonSet[0] === 0) return moreCommonSet[1];

    // Get length of the virtual set by combining the counts of both sets

    const totalLength = setA[0] + setB[0];

    // Obtain an array of "frequencies" that the less common value appears at
    // for example:
    // values of values remaining

    const frequencies = getFrequencyPerDivision(totalLength, lessCommonSet[0]);

    let indexReduction = 0;
    let adjustedLookupIndex = lookupIndex;

    // Iterate through all frequencies to check if the lookup index should yield
    // the less common value or more common value.

    for (const frequency of frequencies) {
        adjustedLookupIndex -= indexReduction;

        // A remainder of `0` means that we are at an index
        // divisible by the frequency

        if (adjustedLookupIndex % frequency === 0) {
            return lessCommonSet[1];
        }

        // Reduce the lookup index on subsequent iterations, to remove all indices
        // covered by previous frequencies.

        indexReduction += Math.floor(adjustedLookupIndex / frequency);
    }

    // The lookup index did not match any frequency, yield the more common value.

    return moreCommonSet[1];
};

/**
 * A recursive function used to determine which indices of `slotsAvailable` will
 * be filled, given a goal of filling `slotsFilledGoal`.
 *
 * Strives for a regular pattern of distribution at each pass, and if any remainder is left,
 * will recurse and re-distribute amongst remaining slots until no remainder or left.
 *
 * | Example output | Meaning                      |
 * |----------------|------------------------------|
 * | [3]            | Every 3 slots will be filled |
 * | [2, 15]        | Every 2 slots will be filled, then every 15 of all remaining slots |
 *
 * @param slotsAvailable The total number of slots of available.
 * @param slotsFilledGoal The total number of slots to fill.
 * @param frequencies
 */

const getFrequencyPerDivision = (
    slotsAvailable: number,
    slotsFilledGoal: number,
    frequencies: number[] = []
): number[] => {
    const normalFrequency = Math.ceil(slotsAvailable / slotsFilledGoal);
    const actualSlotsFilled = Math.ceil(slotsAvailable / normalFrequency);

    frequencies.push(normalFrequency);

    const remainder = slotsFilledGoal - actualSlotsFilled;

    if (!remainder) {
        return frequencies;
    }

    return getFrequencyPerDivision(
        slotsAvailable - slotsFilledGoal,
        remainder,
        frequencies
    );
};

export default evenlyDistributeSets;
