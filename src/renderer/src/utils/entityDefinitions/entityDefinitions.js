// Define what url extension each entry type should have

export const entryTypes = new Set([
    "ip",
    "domain",
    "url",
    "username",
    "password",
    "person",
    "social-media",
    "hash",
    "tool",
    "cve",
    "ttp",
])

export const metadataTypes = new Set([
    "crime",
    "industry",
    "country",
    "company",
])

export const entityCategories = new Set([
    "actor",
    "case",
    "entry",
    "metadata",
]);

export const entityCategoriesReduced = new Set([
    "actor",
    "case",
    "entry",
]);