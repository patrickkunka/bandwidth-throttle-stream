/**
 * Divides a provided integer (`value`) into `n` evenly distributed
 * whole parts (`partsCount`). The values of individual parts may differ
 * by at most 1.
 *
 * Returns the value of a part at the provided index.
 *
 * Uses "truncating integer division"
 * See: https://math.stackexchange.com/questions/2975936/split-a-number-into-n-numbers
 *
 * Modified to merge the resulting sets evenly.
 *
 * @param value The integer to be partioned
 * @param partsCount The number of parts
 * @return An array of evenly distributed parts
 */

const getPartitionedIntegerPartAtIndex = (
    value: number,
    partsCount: number,
    index: number
): number => {
    const d = Math.floor(value / partsCount);
    const r = value % partsCount;

    const [lower, higher] = [
        {
            count: partsCount - r,
            value: d
        },
        {
            count: r,
            value: d + 1
        }
    ].sort((a, b) => a.count - b.count);

    const period = Math.round(partsCount / lower.count);

    return index % period > 0 ? higher.value : lower.value;
};

export default getPartitionedIntegerPartAtIndex;
