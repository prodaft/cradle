import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    DesignNib,
    InfoCircleSolid,
    WarningCircleSolid,
    WarningTriangleSolid,
} from 'iconoir-react';
import { useState } from 'react';

export type StatusOption =
    | 'all'
    | 'healthy'
    | 'warning'
    | 'invalid'
    | 'processing'
    | 'fleeting'
    | 'done'
    | 'error'
    | 'working'
    | 'waiting'
    | 'info';

interface StatusHeaderDropdownProps {
    onStatusChange: (status: string) => void;
    status?: string | null;
    hideFleetingNotes?: boolean;
    statusOptions: StatusOption[];
}

export default function StatusHeaderDropdown({
    onStatusChange,
    status = null,
    statusOptions,
}: StatusHeaderDropdownProps) {
    const [currentStatus, setCurrentStatus] = useState(status || 'all');

    // Default status options based on context
    const options = statusOptions;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'all':
                return <div className='w-[18px] h-[18px] rounded-full bg-muted' />;
            case 'fleeting':
                return <DesignNib className='text-primary' width='18' height='18' />;
            case 'healthy':
            case 'done':
                return (
                    <svg
                        width='18'
                        height='18'
                        viewBox='0 0 24 24'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                        className='text-primary'
                    >
                        <path
                            d='M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                        />
                    </svg>
                );
            case 'warning':
            case 'waiting':
                return (
                    <WarningTriangleSolid
                        className='text-muted-foreground'
                        width='18'
                        height='18'
                    />
                );
            case 'invalid':
            case 'error':
                return (
                    <WarningCircleSolid
                        className='text-destructive'
                        width='18'
                        height='18'
                    />
                );
            case 'processing':
            case 'working':
            case 'info':
                return (
                    <InfoCircleSolid className='text-primary' width='18' height='18' />
                );
            default:
                return <div className='w-[18px] h-[18px] rounded-full bg-muted' />;
        }
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
                    className='inline-flex items-center justify-center hover:bg-bg-secondary hover:text-text-foreground'
                >
                    {getStatusIcon(currentStatus)}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='center' className='p-2'>
                <DropdownMenuRadioGroup
                    value={currentStatus}
                    onValueChange={handleStatusSelect}
                >
                    {options.map((statusOption) => (
                        <Tooltip key={statusOption}>
                            <TooltipTrigger asChild>
                                <DropdownMenuRadioItem
                                    value={statusOption}
                                    className={`flex items-center justify-center w-9 h-9 ${currentStatus === statusOption ? 'bg-bg-secondary ring-1 ring-border-primary' : ''}`}
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
