import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { HeaderNode } from '@/utils/editor/outline';
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
    if (nodeData.children.length > 0) {
        return (
            <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                    <Button
                        variant='ghost'
                        size='sm'
                        className='group w-full justify-start transition-none'
                        onClick={nodeData.onNodeClick}
                    >
                        <ChevronRightIcon className='transition-transform group-data-[state=open]:rotate-90' />
                        <span className='truncate'>{nodeData.nodeName}</span>
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className='mt-1 ml-5 flex flex-col gap-1'>
                    {renderOutlineNodes(nodeData.children, options)}
                </CollapsibleContent>
            </Collapsible>
        );
    }

    const { currentLine } = options;
    const isCurrent =
        currentLine !== undefined &&
        currentLine >= nodeData.startLine &&
        currentLine <= nodeData.endLine;

    return (
        <Button
            variant='link'
            size='sm'
            className='w-full justify-start text-foreground no-underline hover:no-underline'
            onClick={nodeData.onNodeClick}
        >
            <span className='flex size-4 shrink-0 items-center justify-center text-sm leading-none'>
                #
            </span>
            <span
                className={`truncate${isCurrent ? ' underline decoration-primary' : ''}`}
            >
                {nodeData.nodeName}
            </span>
        </Button>
    );
}

export default function NoteOutline({
    data,
    showSeparators = false,
    currentLine,
}: NoteOutlineProps) {
    const options = { showSeparators, currentLine };

    return (
        <div className='flex flex-col gap-1 p-3'>
            {renderOutlineNodes(data, options)}
        </div>
    );
}
