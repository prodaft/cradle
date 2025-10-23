import React from 'react';
import ActionBar from '../ActionBar/ActionBar';

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
}) {
    return (
        <div className={`${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`} {...props}>
            <ActionBar
                actions={actions}
                selectedItems={selectedItems}
                itemLabel={itemLabel}
            />
        </div>
    );
}

export default ActionsTable;
