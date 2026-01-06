import { MouseEvent, useEffect, useRef, useState } from 'react';

interface TableActionsButtonProps {
    /** Menu items to display in the dropdown */
    children: React.ReactNode;
    /** Optional className for the button */
    className?: string;
    /** Optional onClick handler for the button */
    onClick?: (e: MouseEvent) => void;
    /** Whether to stop propagation on click */
    stopPropagation?: boolean;
}

/**
 * Reusable table row actions button with dropdown menu
 *
 * @example
 * ```tsx
 * <TableActionsButton>
 *   <button onClick={handleEdit}>Edit</button>
 *   <button onClick={handleDelete}>Delete</button>
 * </TableActionsButton>
 * ```
 */
export default function TableActionsButton({
    children,
    className = '',
    onClick,
    stopPropagation = true,
}: TableActionsButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<{
        top: number;
        right: number;
    } | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

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
            document.addEventListener('mousedown', handleClickOutside as any);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside as any);
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            // Set initial position to render dropdown off-screen for measurement
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            setDropdownPosition({
                top: -9999,
                right: viewportWidth - buttonRect.right,
            });

            const updatePosition = () => {
                if (!buttonRef.current || !dropdownRef.current) return;

                const buttonRect = buttonRef.current.getBoundingClientRect();
                const dropdownRect = dropdownRef.current.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const viewportWidth = window.innerWidth;
                const spaceBelow = viewportHeight - buttonRect.bottom;
                const spaceAbove = buttonRect.top;
                const dropdownHeight = dropdownRect.height;

                // Calculate position
                let top: number;
                const right = viewportWidth - buttonRect.right;

                if (
                    spaceBelow < dropdownHeight + 8 &&
                    spaceAbove > dropdownHeight + 8
                ) {
                    // Position above - bottom of dropdown at top of button minus margin
                    top = buttonRect.top - dropdownHeight - 8; // 8px margin (mb-2)
                } else {
                    // Position below
                    top = buttonRect.bottom + 8; // 8px margin (mt-2)
                }

                setDropdownPosition({ top, right });
            };

            // Wait for dropdown to render, then calculate position
            const rafId = requestAnimationFrame(() => {
                requestAnimationFrame(updatePosition);
            });
            return () => cancelAnimationFrame(rafId);
        } else {
            setDropdownPosition(null);
        }
    }, [isOpen]);

    const handleButtonClick = (e: MouseEvent) => {
        if (stopPropagation) {
            e.stopPropagation();
        }
        setIsOpen(!isOpen);
        onClick?.(e);
    };

    return (
        <div
            className={`relative ${className}`}
            ref={dropdownRef}
            onClick={(e) => stopPropagation && e.stopPropagation()}
        >
            <button
                ref={buttonRef}
                type='button'
                className={`items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cradle-accent-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-cradle-bg-secondary hover:text-white text-white flex h-8 w-8 p-0 bg-transparent ${isOpen ? 'bg-cradle-bg-secondary' : ''}`}
                data-state={isOpen ? 'open' : 'closed'}
                aria-haspopup='menu'
                aria-expanded={isOpen}
                onClick={handleButtonClick}
            >
                <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='24'
                    height='24'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    className='h-4 w-4 text-white'
                >
                    <circle cx='12' cy='12' r='1'></circle>
                    <circle cx='19' cy='12' r='1'></circle>
                    <circle cx='5' cy='12' r='1'></circle>
                </svg>
                <span className='sr-only'>Open menu</span>
            </button>
            {isOpen && dropdownPosition && (
                <>
                    <div
                        className='fixed inset-0 z-10'
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        ref={dropdownRef}
                        className='fixed w-48 cradle-bg-elevated cradle-border z-20 rounded-lg overflow-hidden py-1 px-1 shadow-lg'
                        style={{
                            top: `${dropdownPosition.top}px`,
                            right: `${dropdownPosition.right}px`,
                        }}
                        onClick={(e) => stopPropagation && e.stopPropagation()}
                    >
                        <div role='menu'>{children}</div>
                    </div>
                </>
            )}
        </div>
    );
}
