import { Badge } from '@/components/custom/badge';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { createDashboardLink } from '@/utils/dashboard';
import {
    ArrowSquareOutIcon,
    CaretDownIcon,
    CaretRightIcon,
    CrosshairIcon,
    XIcon,
} from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Edge, Node } from './graph-filter-utils';

interface ExplorerPanelProps {
    selectedNodes: Set<Node>;
    allNodes: Node[];
    edges: Edge[];
    /** Select another node, such as a connection. */
    onNodeClick?: (node: Node) => void;
    /** Move the graph's camera to a node. */
    onFocus?: (node: Node) => void;
    onClear?: () => void;
}

/** Node fields shown in the card itself (or internal), so not listed again under Details. */
const SHOWN_NODE_KEYS = new Set([
    'id',
    'label',
    'name',
    'noteId',
    'color',
    'degree',
    'type',
    'subtype',
    'location',
]);

/** `Node.type` values (the compressed entry tree's keys) as shown to people. */
const TYPE_LABELS: Record<string, string> = {
    entities: 'Entity',
    artifacts: 'Artifact',
};

/** Connections listed per type before "Show more", and how many more each click adds. */
const CONNECTIONS_PAGE = 10;
const CONNECTIONS_MORE = 50;

/** Above this many connections, a filter box is shown. */
const FILTER_FROM = 12;

/**
 * The entry's own name: `name`, or the label without its `subtype: ` prefix (nodes loaded before `name` was added only
 * carry the label).
 */
export function displayName(node: Node): string {
    if (node.name) return node.name;
    const prefix = node.subtype ? `${node.subtype}: ` : '';
    if (node.label && prefix && node.label.startsWith(prefix)) {
        return node.label.slice(prefix.length);
    }
    return node.label || node.id;
}

/** Where an entry is opened: its note for note entries, otherwise its dashboard. */
function entryHref(node: Node): string | null {
    if (node.noteId) return `/notes/${node.noteId}`;
    // A note's label is its title, not the entry name its dashboard needs.
    if (!node.subtype || node.subtype === 'note') return null;
    return createDashboardLink({ name: displayName(node), subtype: node.subtype });
}

export function ColorDot({
    color,
    className = 'size-2',
}: {
    color?: string;
    className?: string;
}) {
    return (
        <span
            className={`${className} rounded-full shrink-0 border border-border`}
            style={{ backgroundColor: color }}
        />
    );
}

export default function ExplorerPanel({
    selectedNodes,
    allNodes,
    edges,
    onNodeClick,
    onFocus,
    onClear,
}: ExplorerPanelProps) {
    const nodesArray = Array.from(selectedNodes);

    // Neighbours of the selected nodes only: the whole graph can have hundreds of thousands of links.
    const connections = useMemo(() => {
        const nodeMap = new Map(allNodes.map((node) => [node.id, node]));
        const selectedIds = new Set(Array.from(selectedNodes, (node) => node.id));
        const neighbours = new Map<string, Map<string, Node>>();
        const add = (fromId: string, toId: string) => {
            const to = nodeMap.get(toId);
            if (!to || toId === fromId) return;
            let inner = neighbours.get(fromId);
            if (!inner) {
                inner = new Map();
                neighbours.set(fromId, inner);
            }
            inner.set(to.id, to);
        };
        for (const edge of edges) {
            if (selectedIds.has(edge.source)) add(edge.source, edge.target);
            if (selectedIds.has(edge.target)) add(edge.target, edge.source);
        }
        return neighbours;
    }, [selectedNodes, allNodes, edges]);

    if (nodesArray.length === 0) {
        return (
            <div className='px-4 py-8 text-sm text-muted-foreground text-center'>
                Click a node or link on the graph, or search above, to see its details
                here.
            </div>
        );
    }

    return (
        <div className='px-4 py-3 space-y-3'>
            {nodesArray.length > 1 && (
                <div className='flex items-center justify-between'>
                    <span className='text-xs font-medium text-muted-foreground'>
                        {nodesArray.length} selected
                    </span>
                    {onClear && (
                        <Button variant='ghost' size='xs' onClick={onClear}>
                            Clear
                        </Button>
                    )}
                </div>
            )}
            <div className='space-y-3'>
                {nodesArray.map((node) => (
                    <EntryCard
                        key={node.id}
                        node={node}
                        connections={Array.from(
                            connections.get(node.id)?.values() ?? [],
                        )}
                        onNodeClick={onNodeClick}
                        onFocus={onFocus}
                        onClear={nodesArray.length === 1 ? onClear : undefined}
                    />
                ))}
            </div>
        </div>
    );
}

function EntryCard({
    node,
    connections,
    onNodeClick,
    onFocus,
    onClear,
}: {
    node: Node;
    connections: Node[];
    onNodeClick?: (node: Node) => void;
    onFocus?: (node: Node) => void;
    onClear?: () => void;
}) {
    const [filter, setFilter] = useState('');
    const href = entryHref(node);

    const groups = useMemo(() => {
        const query = filter.trim().toLowerCase();
        const bySubtype = new Map<string, Node[]>();
        for (const connection of connections) {
            if (query && !displayName(connection).toLowerCase().includes(query))
                continue;
            const subtype = connection.subtype || 'other';
            const list = bySubtype.get(subtype) ?? [];
            list.push(connection);
            bySubtype.set(subtype, list);
        }
        return [...bySubtype.entries()]
            .map(([subtype, members]) => ({
                subtype,
                color: members[0]?.color,
                members: members.sort((a, b) =>
                    displayName(a).localeCompare(displayName(b), undefined, {
                        numeric: true,
                    }),
                ),
            }))
            .sort((a, b) => b.members.length - a.members.length);
    }, [connections, filter]);

    const details = Object.entries(node).filter(
        ([key, value]) =>
            !SHOWN_NODE_KEYS.has(key) &&
            !key.startsWith('_') &&
            value !== undefined &&
            value !== null &&
            value !== '',
    );

    return (
        <div className='bg-card border border-border rounded-lg p-3 space-y-3'>
            <div className='flex items-start gap-2'>
                <ColorDot color={node.color} className='size-3 mt-1' />
                <div className='flex-1 min-w-0'>
                    <div className='text-sm font-semibold text-foreground break-words'>
                        {displayName(node)}
                    </div>
                    <div className='flex items-center gap-1.5 mt-1'>
                        {node.subtype && (
                            <Badge variant='secondary'>{node.subtype}</Badge>
                        )}
                        {node.type && (
                            <span className='text-xs text-muted-foreground'>
                                {TYPE_LABELS[node.type] ?? node.type}
                            </span>
                        )}
                    </div>
                </div>
                {onClear && (
                    <Button
                        variant='ghost'
                        size='icon-xs'
                        onClick={onClear}
                        title='Clear selection'
                        aria-label='Clear selection'
                    >
                        <XIcon />
                    </Button>
                )}
            </div>

            <ButtonGroup className='w-full'>
                {onFocus && (
                    <Button
                        variant='outline'
                        size='xs'
                        className='flex-1'
                        onClick={() => onFocus(node)}
                        title='Zoom the graph to this entry'
                    >
                        <CrosshairIcon />
                        Focus
                    </Button>
                )}
                {href && (
                    <Button
                        variant='outline'
                        size='xs'
                        className='flex-1'
                        nativeButton={false}
                        render={<Link to={href as any} />}
                        title={node.noteId ? 'Open the note' : 'Open the dashboard'}
                    >
                        <ArrowSquareOutIcon />
                        Open
                    </Button>
                )}
            </ButtonGroup>

            <div className='space-y-2'>
                <div className='text-xs font-medium text-muted-foreground'>
                    Connections{' '}
                    <span className='tabular-nums text-foreground'>
                        {connections.length}
                    </span>
                </div>
                {connections.length > FILTER_FROM && (
                    <Input
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                        placeholder='Filter connections...'
                        className='h-7 text-xs'
                    />
                )}
                {connections.length > 0 && groups.length === 0 && (
                    <div className='text-xs text-muted-foreground'>No matches</div>
                )}
                {groups.map((group) => (
                    <ConnectionGroup
                        key={group.subtype}
                        subtype={group.subtype}
                        color={group.color}
                        members={group.members}
                        onNodeClick={onNodeClick}
                    />
                ))}
            </div>

            {details.length > 0 && (
                <dl className='grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs border-t border-border pt-2'>
                    {details.map(([key, value]) => (
                        <div key={key} className='contents'>
                            <dt className='text-muted-foreground capitalize'>{key}</dt>
                            <dd className='text-foreground break-words min-w-0'>
                                {typeof value === 'object'
                                    ? JSON.stringify(value)
                                    : String(value)}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}
        </div>
    );
}

function ConnectionGroup({
    subtype,
    color,
    members,
    onNodeClick,
}: {
    subtype: string;
    color?: string;
    members: Node[];
    onNodeClick?: (node: Node) => void;
}) {
    const [shown, setShown] = useState(CONNECTIONS_PAGE);
    const hidden = members.length - shown;

    return (
        <Collapsible defaultOpen>
            <CollapsibleTrigger
                render={
                    <Button
                        variant='ghost'
                        size='xs'
                        className='group w-full justify-start px-1'
                    />
                }
            >
                <CaretRightIcon
                    className='group-data-panel-open:hidden'
                    weight='bold'
                />
                <CaretDownIcon
                    className='hidden group-data-panel-open:block'
                    weight='bold'
                />
                <ColorDot color={color} />
                <span className='font-medium'>{subtype}</span>
                <span className='ml-auto tabular-nums text-muted-foreground'>
                    {members.length}
                </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <ul className='ml-3 border-l border-border'>
                    {members.slice(0, shown).map((member) => (
                        <li key={member.id}>
                            <button
                                type='button'
                                className='w-full truncate px-2 py-1 text-left text-xs hover:bg-accent hover:text-accent-foreground'
                                onClick={() => onNodeClick?.(member)}
                                title={displayName(member)}
                            >
                                {displayName(member)}
                            </button>
                        </li>
                    ))}
                </ul>
                {hidden > 0 && (
                    <Button
                        variant='link'
                        size='xs'
                        className='ml-3'
                        onClick={() => setShown((count) => count + CONNECTIONS_MORE)}
                    >
                        {hidden > CONNECTIONS_MORE
                            ? `Show ${CONNECTIONS_MORE} more of ${hidden}`
                            : `Show ${hidden} more`}
                    </Button>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}
