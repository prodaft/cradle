export class TrieNode<T = any> {
    children: { [key: string]: TrieNode<T> };
    eow: boolean;
    data?: T; // Generic data type
    isFullyFetched: boolean; // Indicates if all children of this node have been fetched

    constructor() {
        this.children = {};
        this.eow = false; // End of Word
        this.data = undefined; // Initialize as undefined
        this.isFullyFetched = false; // Initially not fetched
    }
}

export class DynamicTrie {
    root: TrieNode<string[]>;
    defaultType: string; // Default type to be used for missing types
    fetchFunction: null | ((prefix: string) => Promise<{ [key: string]: any }>);
    minQueryLength: number; // Minimum query length before fetching

    /**
     * Creates a new DynamicTrie with a function to fetch serialized tries.
     * @param fetchFunction Function that accepts a prefix and returns a Promise of serialized trie data
     * @param minQueryLength Minimum length of query before fetching (default: 0, -1 for never fetch)
     */
    constructor(
        fetchFunction: null | ((prefix: string) => Promise<{ [key: string]: any }>),
        defaultType: string,
        minQueryLength: number = 0,
    ) {
        this.root = new TrieNode<string[]>();
        this.fetchFunction = fetchFunction;
        this.defaultType = defaultType;
        this.minQueryLength = minQueryLength;
    }

    /**
     * Merges another DynamicTrie instance into this trie
     * @param otherTrie The DynamicTrie to merge into this one
     * @returns The current trie instance (for chaining)
     */
    merge(otherTrie: DynamicTrie): DynamicTrie {
        // Start the recursive merge from the roots of both tries
        this.mergeTrieNodes(this.root, otherTrie.root);
        return this;
    }

    /**
     * Recursively merges two TrieNodes and their children
     * @param targetNode The node in the current trie to merge into
     * @param sourceNode The node from the other trie to merge from
     */
    private mergeTrieNodes(
        targetNode: TrieNode<string[]>,
        sourceNode: TrieNode<string[]>,
    ): void {
        // Merge end-of-word status and data
        if (sourceNode.eow) {
            targetNode.eow = true;

            // Merge data arrays if both nodes have data
            if (sourceNode.data) {
                if (targetNode.data) {
                    targetNode.data = [
                        ...new Set([...targetNode.data, ...sourceNode.data]),
                    ];
                } else {
                    targetNode.data = [...sourceNode.data];
                }
            }
        }

        // Update the fetched status - a node is fully fetched if either source is fully fetched
        if (sourceNode.isFullyFetched) {
            targetNode.isFullyFetched = true;
        }

        // Recursively merge all children
        for (const [char, sourceChildNode] of Object.entries(sourceNode.children)) {
            // Create the child node if it doesn't exist in the target
            if (!targetNode.children[char]) {
                targetNode.children[char] = new TrieNode<string[]>();
            }

            // Recursively merge the child nodes
            this.mergeTrieNodes(targetNode.children[char], sourceChildNode);
        }
    }

    /**
     * Merges a fetched trie into the current trie at the specified prefix path
     * @param prefix The prefix where the fetched trie should be merged
     * @param serializedTrie The serialized trie data
     */
    public mergeTrie(prefix: string, serializedTrie: { [key: string]: any }): void {
        let currentNode = this.root;

        // Navigate to the prefix location
        for (const char of prefix) {
            if (!currentNode.children[char]) {
                currentNode.children[char] = new TrieNode<string[]>();
            }
            currentNode = currentNode.children[char];
        }

        // Merge the serialized trie at this node and mark as fully fetched
        this.mergeNode(currentNode, serializedTrie);
        currentNode.isFullyFetched = true;
    }

    /**
     * Recursive helper to merge a serialized node into the current trie structure
     */
    private mergeNode(
        targetNode: TrieNode<string[]>,
        serializedData: { [key: string]: any },
    ): void {
        // If the serialized node is an end of word, update the target node
        targetNode.isFullyFetched = true;

        if (serializedData.eow) {
            targetNode.eow = true;
            targetNode.data = targetNode.data
                ? [...new Set([...targetNode.data, this.defaultType])]
                : [this.defaultType];
        }

        // Merge children
        if (serializedData.c) {
            for (const [char, childData] of Object.entries(serializedData.c)) {
                if (!targetNode.children[char]) {
                    targetNode.children[char] = new TrieNode<string[]>();
                }
                this.mergeNode(
                    targetNode.children[char],
                    childData as { [key: string]: any },
                );
            }
        }
    }

    /**
     * Determines if data should be fetched based on prefix length and minimum query length configuration
     * @param prefix The prefix to check
     * @returns Boolean indicating if fetch should occur
     */
    private shouldFetch(prefix: string): boolean {
        // If minQueryLength is -1, never fetch
        if (this.minQueryLength === -1) {
            return false;
        }

        console.log(prefix)

        // Otherwise, fetch only if prefix length meets or exceeds the minimum
        return prefix.length >= this.minQueryLength;
    }

    /**
     * Ensures that data for a prefix is loaded, fetching if necessary and if minQueryLength conditions are met
     * @param prefix The prefix to ensure is loaded
     * @returns Promise that resolves when the data is loaded
     */
    private async ensurePrefix(prefix: string): Promise<void> {
        if (!this.fetchFunction || !this.shouldFetch(prefix)) {
            return;
        }

        let currentNode = this.root;

        for (const char of prefix) {
            // If we don't have this character path, we need to fetch from here
            if (!currentNode.children[char]) {
                break;
            }

            currentNode = currentNode.children[char];
        }

        if (currentNode.isFullyFetched) {
            return;
        }

        try {
            const serializedData = await this.fetchFunction(prefix);
            this.mergeTrie(prefix, serializedData);
        } catch (error) {
            console.error(`Failed to fetch data for prefix "${prefix}":`, error);
        }
    }

    /**
     * Search for a word in the trie, fetching data if needed and if minimum query length is met
     * @param word The word to search for
     * @returns Promise resolving to search result
     */
    async searchFetch(word: string): Promise<{ found: boolean; types?: string[] }> {
        // Fetch any missing data if conditions are met
        await this.ensurePrefix(word);

        return this.search(word);
    }

    search(word: string): { found: boolean; types?: string[] } {
        let currentNode = this.root;
        for (const char of word) {
            if (!currentNode.children[char]) {
                return { found: false };
            }
            currentNode = currentNode.children[char];
        }

        return { found: currentNode.eow, types: currentNode.data };
    }

    /**
     * Retrieves all words that start with the given prefix along with their types.
     * @param prefix The prefix to search for
     * @returns Promise resolving to array of matching words and their types
     */
    async allWordsWithPrefixFetch(
        prefix: string,
    ): Promise<{ word: string; types: string[] }[]> {
        // Fetch any missing data for this prefix if conditions are met
        await this.ensurePrefix(prefix);
        return this.allWordsWithPrefix(prefix);
    }

    allWordsWithPrefix(prefix: string): { word: string; types: string[] }[] {
        let currentNode = this.root;
        for (const char of prefix) {
            if (!currentNode.children[char]) {
                return []; // No words with the given prefix
            }
            currentNode = currentNode.children[char];
        }

        const collectWords = (
            node: TrieNode<string[]>,
            currentPrefix: string,
            results: { word: string; types: string[] }[],
        ) => {
            if (node.eow && node.data) {
                results.push({ word: currentPrefix, types: node.data });
            }

            for (const [char, childNode] of Object.entries(node.children)) {
                collectWords(childNode, currentPrefix + char, results);
            }
        };

        const words: { word: string; types: string[] }[] = [];
        collectWords(currentNode, prefix, words);
        return words;
    }

    /**
     * Returns a string representation of the trie structure.
     * @returns A formatted string showing the trie
     */
    printTrie(): string {
        const lines: string[] = [];

        const traverse = (
            node: TrieNode<string[]>,
            prefix: string,
            depth: number,
            indent: string = '',
        ) => {
            const marker = node.eow ? '*' : '';
            const types = node.data ? ` (${node.data.join(', ')})` : '';
            const fetched = node.isFullyFetched ? ' [fetched]' : '';
            lines.push(`${indent}${prefix}${marker}${types}${fetched}`);

            const entries = Object.entries(node.children).sort(([a], [b]) =>
                a.localeCompare(b),
            );
            for (let i = 0; i < entries.length; i++) {
                const [char, child] = entries[i];
                const isLast = i === entries.length - 1;
                const branch = isLast ? '└─ ' : '├─ ';
                const newIndent = indent + (isLast ? '   ' : '│  ');
                traverse(child, char, depth + 1, newIndent + branch);
            }
        };

        traverse(this.root, '', 0);
        return lines.join('\n');
    }
}
