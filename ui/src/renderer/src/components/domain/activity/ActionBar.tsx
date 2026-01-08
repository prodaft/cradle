import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Trash } from 'iconoir-react';
import { Spinner } from '@/components/ui/spinner';

interface Action {
    value: string;
    label: string;
    handler: (selectedItems: string[]) => Promise<void>;
}

interface ActionBarProps {
    actions?: Action[];
    selectedItems?: string[];
    itemLabel?: string;
}

/**
 * ActionBar component - Displays action select dropdown for selected items
 */
export default function ActionBar({
    actions = [],
    selectedItems = [],
    itemLabel = 'row',
}: ActionBarProps) {
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const handleActionSelect = async (actionValue: string) => {
        if (!actionValue || selectedItems.length === 0) return;

        const action = actions.find((a) => a.value === actionValue);
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
    const placeholder = loadingAction
        ? 'Processing...'
        : selectedItems.length > 0
          ? `Actions (${selectedItems.length})`
          : 'Actions';

    return (
        <div className='flex items-center gap-2'>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className={`text-sm flex items-center justify-between gap-2 min-w-[120px] ${
                            isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                        disabled={isDisabled}
                        title={
                            selectedItems.length > 0
                                ? `Select action for ${selectedItems.length} ${itemLabel}${selectedItems.length !== 1 ? 's' : ''}`
                                : `Select ${itemLabel}s to perform actions`
                        }
                    >
                        <span className='truncate'>{placeholder}</span>
                        <svg
                            className='w-4 h-4 transition-transform'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                        >
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M19 9l-7 7-7-7'
                            />
                        </svg>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    {actions.map((action) => (
                        <DropdownMenuItem
                            key={action.value}
                            onClick={() => handleActionSelect(action.value)}
                        >
                            {action.value === 'download' && <Download width='16' height='16' />}
                            {action.value === 'delete' && <Trash width='16' height='16' />}
                            {action.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            {loadingAction && (
                <Spinner className='size-3' />
            )}
        </div>
    );
}
