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
 * Modified to distribute the resulting sets evenly.
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
    // Evenly divide the `value` by `partsCount` and round it down to
    // achieve the `loweredPartValue`

    const loweredPartValue = Math.floor(value / partsCount);

    // If a remainder exists, it will be covered by 1 or more `raisedPartValue`

    const raisedPartValue = loweredPartValue + 1;

    const remainder = value % partsCount;

    // Calculate the total number of occurences of `loweredPartValue` and `raisedPartValue`,
    // and sort in ascending order to find the one with the lower occurences

    const [lessOccurrent, moreOccurrent] = [
        {
            count: partsCount - remainder,
            value: loweredPartValue
        },
        {
            count: remainder,
            value: raisedPartValue
        }
    ].sort((a, b) => a.count - b.count);

    // Calculate the frequency that the less occurrent value should appear in order to
    // evenly distribute it amongst the more occurrent values (e.g. `4` === 1 in 4)

    const frequency = Math.round(partsCount / lessOccurrent.count);

    // Return either the `loweredPartValue` or `raisedPartValue` based on whether or not the
    // provided index is exactly divisible by `frequency`

    return index % frequency > 0 || !remainder
        ? moreOccurrent.value
        : lessOccurrent.value;
};

export default getPartitionedIntegerPartAtIndex;
