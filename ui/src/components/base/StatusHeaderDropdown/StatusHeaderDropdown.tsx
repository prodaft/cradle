import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { StatusIcon, type StatusType } from '@components/domain/notes/StatusIcon';
import { useState } from 'react';

export type StatusOption = StatusType;

interface StatusHeaderDropdownProps {
    onStatusChange: (status: string) => void;
    status?: string | null;
    hideFleetingNotes?: boolean;
    statusOptions: StatusOption[];
    triggerClassName?: string;
}

export default function StatusHeaderDropdown({
    onStatusChange,
    status = null,
    statusOptions,
    triggerClassName,
}: StatusHeaderDropdownProps) {
    const [currentStatus, setCurrentStatus] = useState(status || 'all');

    // Default status options based on context
    const options = statusOptions;

    const getStatusIcon = (status: string) => {
        return <StatusIcon status={status as StatusType} />;
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'all':
                return 'All';
            case 'fleeting':
                return 'Fleeting';
            case 'healthy':
                return 'Healthy';
            case 'done':
                return 'Done';
            case 'warning':
                return 'Warning';
            case 'waiting':
                return 'Waiting';
            case 'invalid':
                return 'Invalid';
            case 'error':
                return 'Error';
            case 'processing':
                return 'Processing';
            case 'working':
                return 'Working';
            case 'info':
                return 'Info';
            default:
                return 'Unknown';
        }
    };

    const handleStatusSelect = (selectedStatus: string) => {
        setCurrentStatus(selectedStatus);
        onStatusChange(selectedStatus);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant='ghost'
                    size='icon-sm'
                    className={cn(
                        'inline-flex items-center justify-center hover:bg-secondary hover:text-foreground',
                        triggerClassName,
                    )}
                >
                    {getStatusIcon(currentStatus)}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='center' className='min-w-0 w-auto p-1'>
                <DropdownMenuRadioGroup
                    value={currentStatus}
                    onValueChange={handleStatusSelect}
                    className='flex flex-col items-center gap-1'
                >
                    {options.map((statusOption) => (
                        <Tooltip key={statusOption}>
                            <TooltipTrigger asChild>
                                <DropdownMenuRadioItem
                                    value={statusOption}
                                    className={`flex items-center justify-center w-9 h-9 p-0 pl-0 pr-0 gap-0 [&>span]:hidden ${currentStatus === statusOption ? 'bg-secondary ring-1 ring-primary' : ''}`}
                                >
                                    {getStatusIcon(statusOption)}
                                </DropdownMenuRadioItem>
                            </TooltipTrigger>
                            <TooltipContent side='right'>
                                {getStatusLabel(statusOption)}
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
