import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { HeaderNode } from '@/utils/editor/outline';
import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react';
import React, { useState } from 'react';

interface TreeNodeProps {
    nodeData: HeaderNode;
    showSeparators?: boolean;
    currentLine?: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({
    nodeData,
    showSeparators = false,
    currentLine,
}) => {
    const [expanded, setExpanded] = useState(true);
    const children = nodeData.children ?? [];
    const hasChildren = children.length > 0;

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded((v) => !v);
    };

    const handleNodeClick = () => nodeData.onNodeClick?.();

    // Check if this node is the current line
    const isCurrent =
        currentLine !== undefined &&
        currentLine >= nodeData.startLine &&
        currentLine <= nodeData.endLine;

    return (
        <div className='ml-4'>
            <div
                className='flex items-center py-1 rounded cursor-pointer hover:text-border-primary'
                onClick={handleNodeClick}
            >
                {hasChildren ? (
                    <Button
                        variant='ghost'
                        size='icon-sm'
                        onClick={toggleExpand}
                        className='w-4 h-4 flex items-center justify-center mr-2 text-primary p-0'
                        title={expanded ? 'Collapse' : 'Expand'}
                    >
                        {expanded ? (
                            <CaretRightIcon
                                className='text-primary'
                                size={14}
                                weight='bold'
                            />
                        ) : (
                            <CaretDownIcon
                                className='text-primary'
                                size={14}
                                weight='bold'
                            />
                        )}
                    </Button>
                ) : (
                    <span className='w-4 flex items-center justify-center mr-2 text-primary'>
                        #
                    </span>
                )}
                <span
                    className={`font-medium ${isCurrent ? 'underline decoration-border-primary' : ''}`}
                >
                    {nodeData.nodeName}
                </span>
            </div>

            {expanded && hasChildren && (
                <div className='border-l border-border pl-1 ml-2'>
                    {children.map((child, index) => (
                        <React.Fragment key={`${index}_${child.nodeName}`}>
                            {showSeparators && child.separatorBefore && (
                                <Separator className='my-2 mx-2 opacity-70' />
                            )}
                            <TreeNode
                                nodeData={child}
                                showSeparators={showSeparators}
                                currentLine={currentLine}
                            />
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
};

interface NoteOutlineProps {
    data: HeaderNode[];
    showSeparators?: boolean;
    title?: string;
    currentLine?: number;
}

const NoteOutline: React.FC<NoteOutlineProps> = ({
    data,
    showSeparators = false,
    title = 'Tree View',
    currentLine,
}) => {
    return (
        <div className='pt-3'>
            {title && (
                <div className='px-1 pb-2 text-xs font-medium text-muted-foreground'>
                    {title}
                </div>
            )}
            <div className='text-muted-foreground text-sm'>
                {data.map((node, index) => (
                    <React.Fragment key={`${index}_${node.nodeName}`}>
                        {showSeparators && node.separatorBefore && (
                            <Separator className='my-2 mx-1 opacity-50' />
                        )}
                        <TreeNode
                            nodeData={node}
                            showSeparators={showSeparators}
                            currentLine={currentLine}
                        />
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default NoteOutline;
