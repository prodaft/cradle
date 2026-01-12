import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/utils/dates';
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
                <div class="diff-line diff-deletion flex items-start bg-destructive/10 dark:bg-destructive/20 border-l-4 border-destructive px-2 py-1">
                    <span class="text-destructive font-bold mr-2 select-none">-</span>
                    <span class="text-destructive/90">${line.deletions.join('')}</span>
                </div>
            `);
                }

                if (line.additions.length) {
                    parts.push(`
                <div class="diff-line diff-addition flex items-start bg-primary/10 dark:bg-primary/20 border-l-4 border-primary px-2 py-1">
                    <span class="text-primary font-bold mr-2 select-none">+</span>
                    <span class="text-primary/90">${line.additions.join('')}</span>
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
                    <span class="text-muted-foreground mr-2 select-none"> </span>
                    <span class="text-foreground">${line.equals.join('')}</span>
                </div>
            `);
                }

                return parts.join('');
            })
            .join('');

        return `
        <div class="diff-container font-mono text-sm bg-muted rounded-md border border-border overflow-hidden">
            ${html}
        </div>
    `;
    };

    const formatDiff = (diffTxt: string) => {
        if (!diffTxt) return '';

        let dmp = new diff_match_patch();
        let patch = dmp.patch_fromText(diffTxt);
        if (!patch || patch.length === 0) {
            return '<span class="text-muted-foreground">No changes</span>';
        }
        // Type assertion needed because diff-match-patch types are incomplete
        let html = diff_prettyDiffLines((patch[0] as any).diffs);
        return html;
    };

    return (
        <Card className='mt-3 dark:!bg-card/70 relative'>
            <Badge
                variant='outline'
                className='absolute top-2 right-2 text-xs uppercase tracking-wide border-primary text-primary bg-primary/8 rounded-[var(--radius-sm)] z-10'
            >
                {log.type}
            </Badge>
            <CardHeader>
                <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className='text-foreground text-sm space-y-1 mb-2'>
                    <div className='items-start gap-2'>
                        <strong className='text-border-primary mr-1'>User:</strong>
                        {log.user.username}
                    </div>
                    <div className='items-start gap-2'>
                        <strong className='text-border-primary mr-1'>Timestamp:</strong>
                        {formattedTimestamp}
                    </div>
                    <div className='items-start gap-2'>
                        <strong className='text-border-primary mr-1'>Object:</strong>
                        {log.objectRepr}
                    </div>
                </div>
                {log.details && (
                    <div className='text-foreground text-sm'>
                        <strong className='text-border-primary text-sm'>
                            Details:
                        </strong>
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
                        <strong className='text-border-primary text-sm'>
                            Caused by:
                        </strong>
                        <Activity log={log.src_log!} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
