import { useState, useRef, useEffect } from 'react';

/**
 * Custom Dropdown Button component
 * @function CustomDropdown
 * @param {Object} props - Component props
 * @param {Array} props.options - Array of option objects with { value: string, label: string }
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Whether dropdown is disabled
 * @param {string} props.title - Title attribute for accessibility
 * @param {function} props.onSelect - Callback when option is selected
 * @returns {JSX.Element}
 */
function CustomDropdown({ options = [], placeholder = 'Actions', disabled = false, title = '', onSelect }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleOptionClick = (option) => {
        setIsOpen(false);
        onSelect(option.value);
    };

    return (
        <div className="cradle-dropdown" ref={dropdownRef}>
            <button
                type="button"
                className={`cradle-select text-sm flex items-center justify-between gap-2 min-w-[120px] ${
                    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                title={title}
            >
                <span className="truncate">{placeholder}</span>
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            
            {isOpen && !disabled && (
                <div className="cradle-dropdown-menu">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className="cradle-dropdown-option flex items-center gap-2"
                            onClick={() => handleOptionClick(option)}
                        >
                            {option.value === 'delete' && (
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                </svg>
                            )}
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

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

    const handleActionSelect = async (actionValue) => {
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
        }
    };

    const isDisabled = selectedItems.length === 0 || loadingAction !== null;
    const placeholder = loadingAction ? 'Processing...' : selectedItems.length > 0 ? `Actions (${selectedItems.length})` : 'Actions';

    return (
        <div className='flex items-center gap-2'>
            <CustomDropdown
                options={actions}
                placeholder={placeholder}
                disabled={isDisabled}
                title={selectedItems.length > 0 ? `Select action for ${selectedItems.length} ${itemLabel}${selectedItems.length !== 1 ? 's' : ''}` : `Select ${itemLabel}s to perform actions`}
                onSelect={handleActionSelect}
            />
            {loadingAction && (
                <span className='loading loading-spinner loading-sm'></span>
            )}
        </div>
    );
}
