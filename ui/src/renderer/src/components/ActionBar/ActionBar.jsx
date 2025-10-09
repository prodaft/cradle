import { useState } from 'react';

/**
 * ActionBar component - Displays action select dropdown for selected items
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
    const [loadingAction, setLoadingAction] = useState(null);

    const handleActionChange = async (e) => {
        const actionValue = e.target.value;
        if (!actionValue || selectedItems.length === 0) return;

        const action = actions.find(a => a.value === actionValue);
        if (!action) return;

        setLoadingAction(action.value);
        try {
            await action.handler(selectedItems);
        } catch (error) {
            console.error('Action failed:', error);
        } finally {
            setLoadingAction(null);
            e.target.value = ''; // Reset select
        }
    };

    const isDisabled = selectedItems.length === 0 || loadingAction !== null;

    return (
        <div className='flex items-center gap-2'>
            <select
                className='cradle-select text-sm py-2 px-3'
                value=''
                onChange={handleActionChange}
                disabled={isDisabled}
                title={selectedItems.length > 0 ? `Select action for ${selectedItems.length} ${itemLabel}${selectedItems.length !== 1 ? 's' : ''}` : `Select ${itemLabel}s to perform actions`}
            >
                <option value='' disabled>
                    {loadingAction ? 'Processing...' : 'Actions'}
                </option>
                {actions.map((action) => (
                    <option key={action.value} value={action.value}>
                        {action.label}
                    </option>
                ))}
            </select>
            {loadingAction && (
                <span className='loading loading-spinner loading-sm'></span>
            )}
        </div>
    );
}
