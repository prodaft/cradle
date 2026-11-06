/** Colour the backend gives every entry class until someone picks one (`EntryClass.color` default). */
const DEFAULT_ENTRY_CLASS_COLOR = '#e66100';

// Categorical colours that stay distinct from each other on dark and light backgrounds.
const PALETTE = [
    '#4e79a7',
    '#f28e2b',
    '#e15759',
    '#76b7b2',
    '#59a14f',
    '#edc948',
    '#b07aa1',
    '#ff9da7',
    '#9c755f',
    '#86bcb6',
    '#d37295',
    '#a0cbe8',
];

/**
 * Graph colour per subtype: the configured colour, or, while a class still has the shared default, a palette colour.
 * Defaults are assigned in alphabetical order so they never collide and stay the same from load to load.
 */
export function graphColors(colors: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    const usingDefault: string[] = [];
    for (const [subtype, color] of Object.entries(colors)) {
        if (
            typeof color === 'string' &&
            color.toLowerCase() !== DEFAULT_ENTRY_CLASS_COLOR
        ) {
            result[subtype] = color;
        } else {
            usingDefault.push(subtype);
        }
    }
    usingDefault.sort().forEach((subtype, index) => {
        result[subtype] = PALETTE[index % PALETTE.length]!;
    });
    return result;
}
