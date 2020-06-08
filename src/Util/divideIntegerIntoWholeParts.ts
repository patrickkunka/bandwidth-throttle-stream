// @deno-types="./divideIntegerIntoWholeParts.d.ts"

/**
 * Divides a provided integer (`value`) into `partsCount` whole parts.
 * The values of all parts may differ by at most 1 (when the number can
 * not be evenly divided).
 *
 * Uses "truncating integer division"
 * See: https://math.stackexchange.com/questions/2975936/split-a-number-into-n-numbers
 *
 * @param value The integer to be partioned
 * @param partsCount The number of parts
 * @return A tuple of two sets, each one a tuple of [count, value]
 */

const divideIntegerIntoWholeParts = (
    value: number,
    partsCount: number
): [[number, number], [number, number]] => {
    const d = Math.floor(value / partsCount);
    const r = value % partsCount;

    return [
        [partsCount - r, d], // fill all other indicides with d,
        [r, r > 0 ? d + 1 : 0] // distribute any remainder `r` between `r` * `d + 1` values
    ];
};

export default divideIntegerIntoWholeParts;
