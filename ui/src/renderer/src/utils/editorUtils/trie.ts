export class TrieNode<T = any> {
    children: { [key: string]: TrieNode<T> };
    eow: boolean;
    data?: T; // Generic data type

    constructor() {
        this.children = {};
        this.eow = false; // End of Word
        this.data = undefined; // Initialize as undefined
    }
}

export class Trie {
    root: TrieNode<string[]>; // Data is now a list of strings

    constructor() {
        this.root = new TrieNode<string[]>();
    }

    insert(word: string, types: string[]): void {
        let current_node = this.root;
        for (const char of word) {
            if (!current_node.children[char]) {
                current_node.children[char] = new TrieNode<string[]>();
            }
            current_node = current_node.children[char];
        }
        current_node.eow = true;
        if (!current_node.data) {
            current_node.data = [...types]; // Store a copy of the types list
        } else {
            // Append new types while avoiding duplicates
            current_node.data.push(...types.filter(type => !current_node.data.includes(type)));
        }
    }

    search(word: string): { found: boolean; types?: string[] } {
        let current_node = this.root;
        for (const char of word) {
            if (!current_node.children[char]) {
                return { found: false };
            }
            current_node = current_node.children[char];
        }
        return { found: current_node.eow, types: current_node.data };
    }

    startsWith(prefix: string): boolean {
        let current_node = this.root;
        for (const char of prefix) {
            if (!current_node.children[char]) {
                return false;
            }
            current_node = current_node.children[char];
        }
        return true;
    }

    /**
     * Merges multiple Tries into a new Trie.
     * @param tries Array of Trie instances to merge.
     * @returns A new merged Trie instance.
     */
    static merge(tries: Trie[]): Trie {
        const newTrie = new Trie();

        // Helper function to recursively merge nodes
        const mergeNodes = (target: TrieNode<string[]>, source: TrieNode<string[]>) => {
            for (const [char, childNode] of Object.entries(source.children)) {
                if (!target.children[char]) {
                    target.children[char] = new TrieNode<string[]>();
                }
                mergeNodes(target.children[char], childNode);
            }
            // Merge leaf node data by appending unique types
            if (source.eow) {
                target.eow = true;
                if (!target.data) {
                    target.data = [...(source.data || [])]; // Copy source data
                } else {
                    // Append unique types to avoid duplicates
                    target.data.push(...(source.data || []).filter(type => !target.data.includes(type)));
                }
            }
        };

        for (const trie of tries) {
            mergeNodes(newTrie.root, trie.root);
        }

        return newTrie;
    }

    /**
     * Retrieves all words that start with the given prefix along with their types.
     */
    allWordsWithPrefix(prefix: string): { word: string; types: string[] }[] {
        let current_node = this.root;
        for (const char of prefix) {
            if (!current_node.children[char]) {
                return []; // No words with the given prefix
            }
            current_node = current_node.children[char];
        }

        const collectWords = (node: TrieNode<string[]>, currentPrefix: string, results: { word: string; types: string[] }[]) => {
            if (node.eow && node.data) {
                results.push({ word: currentPrefix, types: node.data });
            }
            for (const [char, childNode] of Object.entries(node.children)) {
                collectWords(childNode, currentPrefix + char, results);
            }
        };

        const words: { word: string; types: string[] }[] = [];
        collectWords(current_node, prefix, words);
        return words;
    }

    /**
     * Deserializes a Trie from a JSON-like object.
     * @param serialized The serialized representation of a Trie.
     * @returns A new Trie instance.
     */
    static deserialize(serialized: { [key: string]: any }, type: string): Trie {
        const _deserializeNode = (data: { [key: string]: any }): TrieNode<string[]> => {
            const node = new TrieNode<string[]>();

            if (data.c) {
                for (const [char, childData] of Object.entries(data.c)) {
                    node.children[char] = _deserializeNode(childData as { [key: string]: any });
                }
            }

            if (data.eow) {
                node.eow = true;
                node.data = data.data ? [...data.data] : [type];
            }

            return node;
        };

        const trie = new Trie();
        trie.root = _deserializeNode(serialized);
        return trie;
    }

}
