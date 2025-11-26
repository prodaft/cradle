import React from 'react';
import ActionBar from './ActionBar';

export interface Action {
    value: string;
    label: string;
    handler: (selectedItems: string[]) => Promise<void>;
}

interface ActionsTableProps {
    actions?: Action[];
    selectedItems?: string[];
    itemLabel?: string;
    disabled?: boolean;
    className?: string;
}

/**
 * Reusable ActionsTable component that wraps ActionBar with consistent styling for table/list views
 */
function ActionsTable({
    actions = [],
    selectedItems = [],
    itemLabel = 'item',
    disabled = false,
    className = '',
    ...props
}: ActionsTableProps & React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
            {...props}
        >
            <ActionBar
                actions={actions}
                selectedItems={selectedItems}
                itemLabel={itemLabel}
            />
        </div>
    );
}

export default ActionsTable;
