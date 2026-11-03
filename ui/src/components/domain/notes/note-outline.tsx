import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { HeaderNode } from '@/utils/editor/outline';
import { TreeViewIcon } from '@phosphor-icons/react';
import { ChevronRightIcon } from 'lucide-react';
import { Fragment } from 'react';

interface NoteOutlineProps {
    data: HeaderNode[];
    showSeparators?: boolean;
    currentLine?: number;
}

interface OutlineOptions {
    showSeparators: boolean;
    currentLine?: number;
}

function renderOutlineNodes(nodes: HeaderNode[], options: OutlineOptions) {
    return nodes.map((node) => (
        <Fragment key={`${node.startLine}-${node.nodeName}`}>
            {options.showSeparators && node.separatorBefore && (
                <Separator className='my-2 opacity-50' />
            )}
            <OutlineNode nodeData={node} options={options} />
        </Fragment>
    ));
}

function OutlineNode({
    nodeData,
    options,
}: {
    nodeData: HeaderNode;
    options: OutlineOptions;
}) {
    const { currentLine } = options;
    const firstChild = nodeData.children[0];
    // A heading is current while the cursor is in its own text, before any sub-heading.
    const ownEndLine = firstChild ? firstChild.startLine - 1 : nodeData.endLine;
    const isCurrent =
        currentLine !== undefined &&
        currentLine >= nodeData.startLine &&
        currentLine <= ownEndLine;

    const label = (
        <Button
            variant='ghost'
            size='sm'
            className='min-w-0 flex-1 justify-start'
            onClick={nodeData.onNodeClick}
        >
            <span
                className={cn('truncate', isCurrent && 'underline decoration-primary')}
            >
                {nodeData.nodeName}
            </span>
        </Button>
    );

    if (!firstChild) {
        return (
            <div className='flex items-center'>
                <span
                    className='flex size-7 shrink-0 items-center justify-center text-sm leading-none text-muted-foreground'
                    aria-hidden='true'
                >
                    #
                </span>
                {label}
            </div>
        );
    }

    return (
        <Collapsible defaultOpen>
            <div className='flex items-center'>
                <CollapsibleTrigger
                    render={
                        <Button
                            variant='ghost'
                            size='icon-sm'
                            className='group shrink-0 text-muted-foreground'
                            aria-label={`Toggle ${nodeData.nodeName}`}
                        />
                    }
                >
                    <ChevronRightIcon className='transition-transform group-data-panel-open:rotate-90' />
                </CollapsibleTrigger>
                {label}
            </div>
            <CollapsibleContent className='mt-1 ml-5 flex flex-col gap-1'>
                {renderOutlineNodes(nodeData.children, options)}
            </CollapsibleContent>
        </Collapsible>
    );
}

export default function NoteOutline({
    data,
    showSeparators = false,
    currentLine,
}: NoteOutlineProps) {
    const options = { showSeparators, currentLine };

    if (data.length === 0) {
        return (
            <Empty className='h-full gap-3 p-4'>
                <EmptyHeader>
                    <EmptyMedia variant='icon'>
                        <TreeViewIcon />
                    </EmptyMedia>
                    <EmptyTitle>No headings</EmptyTitle>
                    <EmptyDescription>
                        Headings you add will appear here.
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <div className='flex flex-col gap-1 p-3'>
            {renderOutlineNodes(data, options)}
        </div>
    );
}
