import { HeaderNode } from '@/utils/editor/outline';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { NavArrowDown, NavArrowRight } from 'iconoir-react';
import React, { useState } from 'react';

interface TreeNodeProps {
    nodeData: HeaderNode;
    level?: number;
    showSeparators?: boolean;
    currentLine?: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({
    nodeData,
    level = 0,
    showSeparators = false,
    currentLine,
}) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = nodeData.children && nodeData.children.length > 0;

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(!expanded);
    };

    const handleNodeClick = () => {
        if (nodeData.onNodeClick) {
            nodeData.onNodeClick(nodeData.nodeName, nodeData.children, level);
        }
    };

    // Check if this node is the current line
    const isCurrent =
        currentLine !== undefined &&
        currentLine >= nodeData.startLine &&
        currentLine <= nodeData.endLine;

    return (
        <div className='ml-4'>
            <div
                className={`flex items-center py-1 rounded cursor-pointer hover:text-cradle-accent-primary`}
                onClick={handleNodeClick}
            >
                {hasChildren ? (
                    <Button
                        variant='ghost'
                        size='icon-sm'
                        onClick={toggleExpand}
                        className='w-4 h-4 flex items-center justify-center mr-2 text-cradle2 p-0'
                        title={expanded ? 'Collapse' : 'Expand'}
                    >
                        {expanded ? (
                            <NavArrowRight
                                className='text-cradle2'
                                width='14'
                                height='14'
                            />
                        ) : (
                            <NavArrowDown
                                className='text-cradle2'
                                width='14'
                                height='14'
                            />
                        )}
                    </Button>
                ) : (
                    <span className='w-4 flex items-center justify-center mr-2 text-cradle2'>
                        #
                    </span>
                )}
                <span
                    className={`font-medium ${isCurrent ? 'underline decoration-cradle-accent-primary' : ''}`}
                >
                    {nodeData.nodeName}
                </span>
            </div>

            {expanded && hasChildren && (
                <div className='border-l border-gray-600 pl-1 ml-2'>
                    {nodeData.children!.map((child, index) => (
                        <React.Fragment key={`${index}_${child.nodeName}`}>
                            {showSeparators && child.separatorBefore && (
                                <Separator className='my-2 mx-2 opacity-70' />
                            )}
                            <TreeNode
                                nodeData={child}
                                level={level + 1}
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
            <div className='text-gray-300 text-base'>
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
