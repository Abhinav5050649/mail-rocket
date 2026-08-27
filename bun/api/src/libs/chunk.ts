/**
 * Splits `items` into consecutive groups of at most `size` elements each.
 * The last group may be smaller. `size` must be a positive integer.
 */
export const chunkArray = <T>(items: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
};
