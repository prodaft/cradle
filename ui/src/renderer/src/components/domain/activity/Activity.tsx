import { formatDate } from '@/utils/dates';
import Card from '@components/base/Card/Card';
import { diff_match_patch } from 'diff-match-patch';
import Prism from 'prismjs';
import 'prismjs/components/prism-diff';
import 'prismjs/themes/prism-tomorrow.css';
import { useEffect, useState } from 'react';

interface ActivityLog {
    timestamp: string;
    type: string;
    user: {
        username: string;
    };
    objectRepr: string;
    details?: string;
    srcLog?: ActivityLog;
    src_log?: ActivityLog;
}

interface ActivityProps {
    log: ActivityLog;
}

/**
 * Activity component - Displays details of an activity log entry.
 */
export default function Activity({ log }: ActivityProps) {
    const [formattedTimestamp, setFormattedTimestamp] = useState('');

    useEffect(() => {
        setFormattedTimestamp(formatDate(new Date(log.timestamp)));
    }, [log.timestamp]);

    useEffect(() => {
        Prism.highlightAll();
    }, [log.details]);

    // Alternative version with line-by-line display
    const diff_prettyDiffLines = function (diffs: any[][]) {
        const lines: Array<{
            additions: string[];
            deletions: string[];
            equals: string[];
        }> = [];
        let currentLine = {
            additions: [] as string[],
            deletions: [] as string[],
            equals: [] as string[],
        };

        const pattern_amp = /&/g;
        const pattern_lt = /</g;
        const pattern_gt = />/g;

        for (let x = 0; x < diffs.length; x++) {
            const op = diffs[x][0];
            const data = diffs[x][1];

            // Split by newlines to handle multi-line diffs
            const parts = data.split('\n');

            for (let i = 0; i < parts.length; i++) {
                const text = parts[i]
                    .replace(pattern_amp, '&amp;')
                    .replace(pattern_lt, '&lt;')
                    .replace(pattern_gt, '&gt;');

                if (text) {
                    switch (op) {
                        case diff_match_patch.DIFF_INSERT:
                            currentLine.additions.push(text);
                            break;
                        case diff_match_patch.DIFF_DELETE:
                            currentLine.deletions.push(text);
                            break;
                        case diff_match_patch.DIFF_EQUAL:
                            currentLine.equals.push(text);
                            break;
                    }
                }

                // If we're not at the last part, we hit a newline
                if (i < parts.length - 1) {
                    lines.push(currentLine);
                    currentLine = { additions: [], deletions: [], equals: [] };
                }
            }
        }

        // Don't forget the last line
        if (
            currentLine.additions.length ||
            currentLine.deletions.length ||
            currentLine.equals.length
        ) {
            lines.push(currentLine);
        }

        // Build the HTML
        const html = lines
            .map((line, _index) => {
                const parts: string[] = [];

                if (line.deletions.length) {
                    parts.push(`
                <div class="diff-line diff-deletion flex items-start bg-red-50 dark:bg-red-950 border-l-4 border-red-500 px-2 py-1">
                    <span class="text-red-600 dark:text-red-400 font-bold mr-2 select-none">-</span>
                    <span class="text-red-700 dark:text-red-300">${line.deletions.join('')}</span>
                </div>
            `);
                }

                if (line.additions.length) {
                    parts.push(`
                <div class="diff-line diff-addition flex items-start bg-green-50 dark:bg-green-950 border-l-4 border-green-500 px-2 py-1">
                    <span class="text-green-600 dark:text-green-400 font-bold mr-2 select-none">+</span>
                    <span class="text-green-700 dark:text-green-300">${line.additions.join('')}</span>
                </div>
            `);
                }

                if (
                    line.equals.length &&
                    !line.additions.length &&
                    !line.deletions.length
                ) {
                    parts.push(`
                <div class="diff-line diff-context flex items-start px-2 py-1">
                    <span class="text-gray-400 mr-2 select-none"> </span>
                    <span class="text-gray-600 dark:text-gray-400">${line.equals.join('')}</span>
                </div>
            `);
                }

                return parts.join('');
            })
            .join('');

        return `
        <div class="diff-container font-mono text-sm bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            ${html}
        </div>
    `;
    };

    const formatDiff = (diffTxt: string) => {
        if (!diffTxt) return '';

        let dmp = new diff_match_patch();
        let patch = dmp.patch_fromText(diffTxt);
        if (!patch || patch.length === 0) {
            return '<span class="text-gray-500">No changes</span>';
        }
        // Type assertion needed because diff-match-patch types are incomplete
        let html = diff_prettyDiffLines((patch[0] as any).diffs);
        return html;
    };

    return (
        <Card
            className='mt-3 dark:!bg-cradle-bg-elevated/70'
            badge={log.type}
            badgeClass='border border-cradle-accent-primary text-cradle-accent-primary'
            details={{
                User: log.user.username,
                Timestamp: formattedTimestamp,
                Object: log.objectRepr,
            }}
        >
            {log.details && (
                <div className='text-gray-700 dark:text-gray-300 text-sm'>
                    <strong className='text-cradle-accent-primary text-sm'>Details:</strong>
                    <div
                        className='mt-2'
                        dangerouslySetInnerHTML={{
                            __html: formatDiff(log.details),
                        }}
                    />
                </div>
            )}
            {log.srcLog && (
                <div className='mt-3'>
                    <strong className='text-cradle-accent-primary text-sm'>Caused by:</strong>
                    <Activity log={log.src_log!} />
                </div>
            )}
        </Card>
    );
}
