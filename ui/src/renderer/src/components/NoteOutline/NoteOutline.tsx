import React, { useState } from 'react';
import { HeaderNode } from '../../utils/editorUtils/markdownOutliner';

interface TreeNodeProps {
    nodeData: HeaderNode;
    level?: number;
    showSeparators?: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
    nodeData,
    level = 0,
    showSeparators = false,
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

    return (
        <div className='ml-4'>
            <div
                className='flex items-center py-1 hover:bg-gray-700 hover:bg-opacity-50 rounded   cursor-pointer'
                onClick={handleNodeClick}
            >
                {hasChildren ? (
                    <button
                        onClick={toggleExpand}
                        className={`w-4 flex items-center justify-center mr-2 text-cradle2  focus:outline-none ${expanded ? 'rotate-90' : ''}`}
                        title={expanded ? 'Collapse' : 'Expand'}
                    >
                        ▶
                    </button>
                ) : (
                    // Render an empty span as a placeholder to reserve space
                    <span className='w-4 mr-2 text-cradle2'>#</span>
                )}
                <span className='font-medium dark:text-white'>{nodeData.nodeName}</span>
            </div>

            {expanded && hasChildren && (
                <div className='border-l border-gray-600 pl-1 ml-2'>
                    {nodeData.children!.map((child, index) => (
                        <React.Fragment key={`${index}_${child.nodeName}`}>
                            {showSeparators && child.separatorBefore && (
                                <div className='border-b border-gray-700 my-2 mx-2 opacity-70'></div>
                            )}
                            <TreeNode
                                nodeData={child}
                                level={level + 1}
                                showSeparators={showSeparators}
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
}

const NoteOutline: React.FC<NoteOutlineProps> = ({
    data,
    showSeparators = false,
    title = 'Tree View',
}) => {
    return (
        <div className=''>
            <div className='flex justify-between items-center mb-2 ml-2'>
                <h2 className='text-lg font-bold dark:text-white'>{title}</h2>
                <div className='border-b border-gray-700 my-2 mx-2 opacity-70'></div>
            </div>
            <div className='text-gray-300 text-sm'>
                {data.map((node, index) => (
                    <React.Fragment key={`${index}_${node.nodeName}`}>
                        {showSeparators && node.separatorBefore && (
                            <div className='border-b border-gray-700 my-2 mx-1 opacity-50'></div>
                        )}
                        <TreeNode nodeData={node} showSeparators={showSeparators} />
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default NoteOutline;
