#!/usr/bin/env ts-node

/**
 * Post-generation script to fix missing imports in OpenAPI-generated TypeScript files.
 *
 * This script fixes known issues:
 * 1. Notification.ts — missing imports + incorrect default case
 * 2. EntryCompressedTreeValue.ts — missing import and broken FromJSONTyped/ToJSONTyped implementation
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CRADLE_MODELS_PATH = path.join(
    __dirname,
    '..',
    'src',
    'services',
    'cradle',
    'models',
);

/* -------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------- */

async function readFileSafe(file: string): Promise<string | null> {
    try {
        return await fs.readFile(file, 'utf8');
    } catch {
        console.warn(`Warning: Missing file: ${file}`);
        return null;
    }
}

async function writeFileSafe(file: string, content: string): Promise<void> {
    await fs.writeFile(file, content, 'utf8');
}

async function fixNotificationImports(): Promise<void> {
    const filePath = path.join(CRADLE_MODELS_PATH, 'Notification.ts');
    const content = await readFileSafe(filePath);
    if (!content) return;

    // Check if imports are present (not just usage of the functions)
    const requiredImports = [
        /import\s*\{[^}]*MessageNotificationFromJSONTyped[^}]*\}\s*from/,
        /import\s*\{[^}]*NewUserNotificationFromJSONTyped[^}]*\}\s*from/,
        /import\s*\{[^}]*ReportRenderNotificationFromJSONTyped[^}]*\}\s*from/,
        /import\s*\{[^}]*ReportProcessingErrorNotificationFromJSONTyped[^}]*\}\s*from/,
        /import\s*\{[^}]*AccessRequestNotificationFromJSONTyped[^}]*\}\s*from/,
    ];

    const hasAllImports = requiredImports.every((regex) => regex.test(content));
    const hasCorrectDefault = !/default:\s*return\s+json;/.test(content);

    if (hasAllImports && hasCorrectDefault) {
        console.log('✓ Notification.ts already fully fixed');
        return;
    }

    let modified = content;

    // Add imports if missing
    if (!hasAllImports) {
        const newImports = `import { AccessRequestNotification, AccessRequestNotificationFromJSONTyped, AccessRequestNotificationToJSON } from "./AccessRequestNotification";
import { MessageNotification, MessageNotificationFromJSONTyped, MessageNotificationToJSON } from "./MessageNotification";
import { NewUserNotification, NewUserNotificationFromJSONTyped, NewUserNotificationToJSON } from "./NewUserNotification";
import { ReportProcessingErrorNotification, ReportProcessingErrorNotificationFromJSONTyped, ReportProcessingErrorNotificationToJSON } from "./ReportProcessingErrorNotification";
import { ReportRenderNotification, ReportRenderNotificationFromJSONTyped, ReportRenderNotificationToJSON } from "./ReportRenderNotification";
import { EnrichmentCompleteNotification, EnrichmentCompleteNotificationFromJSONTyped, EnrichmentCompleteNotificationToJSON } from "./EnrichmentCompleteNotification";
import { EnrichmentErrorNotification, EnrichmentErrorNotificationFromJSONTyped, EnrichmentErrorNotificationToJSON } from "./EnrichmentErrorNotification";
`;

        // Try to replace existing partial import first
        const oldImportRegex =
            /import\s*{\s*AccessRequestNotification\s*}\s*from\s*["']\.\/AccessRequestNotification["'];?/;

        if (oldImportRegex.test(modified)) {
            modified = modified.replace(oldImportRegex, newImports);
        } else {
            // No existing import found - insert after the header comment block
            modified = modified.replace(/(\*\/\s*\n)/, `$1${newImports}\n`);
        }
    }

    const regex = /default:\s*return\s+json;/g;
    const matches = [...modified.matchAll(regex)];
    if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        modified =
            modified.slice(0, lastMatch.index) +
            'default: return value;' +
            modified.slice(lastMatch.index + lastMatch[0].length);
    }

    await writeFileSafe(filePath, modified);
    console.log('✓ Fixed Notification.ts imports and default case');
}

async function fixEntryCompressedTreeValue(): Promise<void> {
    const filePath = path.join(CRADLE_MODELS_PATH, 'EntryCompressedTreeValue.ts');
    const content = await readFileSafe(filePath);
    if (!content) return;

    // Detect if already fixed (check for the import AND no orphaned returns)
    const hasImport =
        /import\s*\{[^}]*EntryCompressedTreeObjectFromJSONTyped[^}]*\}\s*from/.test(
            content,
        );
    const hasOrphanedReturns = /\n\s*return \{\}(?: as any)?;\n\}/.test(content);

    if (hasImport && !hasOrphanedReturns) {
        console.log('✓ EntryCompressedTreeValue.ts already fixed');
        return;
    }

    let modified = content;

    // Add import if not present
    if (!hasImport) {
        const importBlock = `import { EntryCompressedTreeObject, EntryCompressedTreeObjectFromJSONTyped, EntryCompressedTreeObjectToJSONTyped } from "./EntryCompressedTreeObject";\n\n`;

        // Insert import after first comment block
        modified = modified.replace(/(\*\/\s*\n+)/, `$1${importBlock}`);
    }

    //
    // Replace FromJSONTyped implementation
    //
    const fromJSONImpl = `export function EntryCompressedTreeValueFromJSONTyped(json: any, ignoreDiscriminator: boolean): EntryCompressedTreeValue {
    if (json == null) return json;
    if (typeof json === "string") return json;
    return EntryCompressedTreeObjectFromJSONTyped(json, ignoreDiscriminator);
}`;

    modified = modified.replace(
        /export function EntryCompressedTreeValueFromJSONTyped\(json: any, ignoreDiscriminator: boolean\): EntryCompressedTreeValue \{[^}]*\}/,
        fromJSONImpl,
    );

    //
    // Replace ToJSONTyped implementation
    //
    const toJSONImpl = `export function EntryCompressedTreeValueToJSONTyped(value?: EntryCompressedTreeValue | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) return value;
    if (typeof value === "string") return value;
    return EntryCompressedTreeObjectToJSONTyped(value, ignoreDiscriminator);
}`;

    modified = modified.replace(
        /export function EntryCompressedTreeValueToJSONTyped\(value\?: EntryCompressedTreeValue \| null, ignoreDiscriminator: boolean = false\): any \{[^}]*\}/,
        toJSONImpl,
    );

    //
    // Clean up any orphaned return statements left behind by the generator
    // These appear as:
    //     return {} as any;
    // }
    // or:
    //     return {};
    // }
    //
    modified = modified.replace(/\n\s*return \{\} as any;\n\}/g, '');
    modified = modified.replace(/\n\s*return \{\};\n\}/g, '');

    await writeFileSafe(filePath, modified);
    console.log('✓ Fixed EntryCompressedTreeValue.ts imports + JSON functions');
}

async function suppressTypeErrors(): Promise<void> {
    const rootDir = path.join(CRADLE_MODELS_PATH, '..');

    async function processDirectory(dir: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                await processDirectory(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.ts')) {
                const content = await readFileSafe(fullPath);
                if (content && !content.startsWith('// @ts-nocheck')) {
                    await writeFileSafe(fullPath, '// @ts-nocheck\n' + content);
                }
            }
        }
    }

    await processDirectory(rootDir);
    console.log('✓ Added // @ts-nocheck to all generated files');
}

/* -------------------------------------------------------------
 * MAIN
 * ------------------------------------------------------------- */

(async function main() {
    console.log('Fixing OpenAPI generator issues...\n');

    await fixNotificationImports();
    await fixEntryCompressedTreeValue();
    await suppressTypeErrors();

    console.log('\n✓ All fixes applied successfully!');
})();
