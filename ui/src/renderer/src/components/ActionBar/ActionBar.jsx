import { useState } from 'react';

/**
 * ActionBar component - Displays a dropdown for selecting actions and applying them to selected items
 * @function ActionBar
 * @param {Object} props - Component props
 * @param {Array} props.actions - Array of action objects with { value: string, label: string, handler: async function }
 * @param {Array} props.selectedItems - Array of selected item IDs
 * @param {string} props.itemLabel - Label for the items (e.g., 'row', 'note', 'digest')
 * @returns {JSX.Element}
 */
export default function ActionBar({
    actions = [],
    selectedItems = [],
    itemLabel = 'row',
}) {
    const [selectedAction, setSelectedAction] = useState('');
    const [isApplying, setIsApplying] = useState(false);

    const handleApplyAction = async () => {
        if (!selectedAction || selectedItems.length === 0) return;

        const action = actions.find((a) => a.value === selectedAction);
        if (!action || !action.handler) return;

        setIsApplying(true);
        try {
            await action.handler(selectedItems);
        } catch (error) {
            console.error('Action failed:', error);
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <div className='flex items-center gap-3'>
            <select
                className='select select-sm select-bordered w-48'
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                disabled={selectedItems.length === 0}
            >
                <option value=''>Select action...</option>
                {actions.map((action) => (
                    <option key={action.value} value={action.value}>
                        {action.label}
                    </option>
                ))}
            </select>
            <span className='text-sm text-gray-600 dark:text-gray-400'>
                {selectedItems.length} {itemLabel}
                {selectedItems.length !== 1 ? 's' : ''} selected
            </span>
            <button
                className='btn btn-sm btn-primary'
                onClick={handleApplyAction}
                disabled={!selectedAction || selectedItems.length === 0 || isApplying}
            >
                {isApplying ? (
                    <>
                        <span className='loading loading-spinner loading-sm'></span>
                        Applying...
                    </>
                ) : (
                    'Apply'
                )}
            </button>
        </div>
    );
}
