import {
    DesignNib,
    InfoCircleSolid,
    WarningCircleSolid,
    WarningTriangleSolid,
} from 'iconoir-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Tooltip from '../Tooltip/Tooltip';

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
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Default status options based on context
    const options = statusOptions;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'all':
                return <div className='w-[18px] h-[18px] rounded-full bg-gray-500' />;
            case 'fleeting':
                return <DesignNib className='text-[#FF8C00]' width='18' height='18' />;
            case 'healthy':
            case 'done':
                return (
                    <svg
                        width='18'
                        height='18'
                        viewBox='0 0 24 24'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                        className='text-green-500'
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
                        className='text-amber-500'
                        width='18'
                        height='18'
                    />
                );
            case 'invalid':
            case 'error':
                return (
                    <WarningCircleSolid
                        className='text-red-500'
                        width='18'
                        height='18'
                    />
                );
            case 'processing':
            case 'working':
            case 'info':
                return (
                    <InfoCircleSolid className='text-blue-500' width='18' height='18' />
                );
            default:
                return <div className='w-[18px] h-[18px] rounded-full bg-gray-500' />;
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
        setIsOpen(false);
    };

    const toggleDropdown = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 8,
                left: rect.left + rect.width / 2,
            });
        }

        setIsOpen(!isOpen);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                buttonRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <>
            <button
                ref={buttonRef}
                onClick={toggleDropdown}
                className='inline-flex items-center justify-center hover:bg-cradle-bg-secondary hover:text-cradle-text-primary transition-colors'
            >
                {getStatusIcon(currentStatus)}
            </button>

            {isOpen &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        className='fixed bg-cradle-bg-elevated border border-cradle-border-accent rounded-lg shadow-lg p-2 z-[9999] flex flex-col gap-1'
                        style={{
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                            transform: 'translateX(-50%)',
                        }}
                    >
                        {options.map((statusOption) => (
                            <Tooltip
                                key={statusOption}
                                content={getStatusLabel(statusOption)}
                                side='right'
                            >
                                <button
                                    onClick={() => handleStatusSelect(statusOption)}
                                    className={`flex items-center justify-center w-9 h-9 rounded-md hover:bg-cradle-bg-secondary transition-colors ${
                                        currentStatus === statusOption
                                            ? 'bg-cradle-bg-secondary ring-1 ring-cradle-accent-primary'
                                            : ''
                                    }`}
                                >
                                    {getStatusIcon(statusOption)}
                                </button>
                            </Tooltip>
                        ))}
                    </div>,
                    document.body,
                )}
        </>
    );
}
