/**
 * Uses "truncating integer division"
 * See: https://math.stackexchange.com/questions/2975936/split-a-number-into-n-numbers
 *
 * Modified to merge the resulting sets evenly.
 *
 * @param value The integer to be partioned
 * @param partsCount The number of parts
 * @return An array of evenly distributed parts
 */

const partitionInteger = (value: number, partsCount: number): number[] => {
    const d = Math.floor(value / partsCount);
    const r = value % partsCount;
    const parts: number[] = [];
    const partsMap = [
        [partsCount - r, d],
        [r, d + 1]
    ].sort((a, b) => a[0] - b[0]);
    const period = Math.round(partsCount / partsMap[0][0]);

    for (let i = 0; i < partsCount; i++) {
        if (i % period === 0) {
            parts.push(partsMap[0][1]);
        } else {
            parts.push(partsMap[1][1]);
        }
    }

    return parts;
};

export default partitionInteger;
