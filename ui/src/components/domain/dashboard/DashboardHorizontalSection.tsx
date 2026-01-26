import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react';
import { useRouterState } from '@tanstack/react-router';
import { ReactNode, useEffect, useState } from 'react';

interface DashboardHorizontalSectionProps {
    title: string;
    children?: ReactNode;
    onExpand?: ((expanded: boolean) => void) | null;
}

/**
 * DashboardHorizontalSection component - This component is used to display a horizontal section on the dashboard.
 * Used for displaying entities on the dashboard.
 *
 * @function DashboardHorizontalSection
 * @param {DashboardHorizontalSectionProps} props - The props object
 * @returns {DashboardHorizontalSection}
 * @constructor
 */
export default function DashboardHorizontalSection({
    title,
    children,
    onExpand = null,
}: DashboardHorizontalSectionProps) {
    const location = useRouterState({
        select: (state) => state.location,
    });
    const [expanded, setExpanded] = useState(false);

    const toggleExpanded = () => {
        setExpanded(!expanded);
        if (onExpand) {
            onExpand(!expanded);
        }
    };

    useEffect(() => {
        setExpanded(false);
    }, [location]);

    return (
        <div className='bg-card/20 p-4 rounded-xl w-full'>
            <div
                className='text-xl font-semibold mb-2 cursor-pointer w-full flex flex-row justify-between items-center'
                onClick={toggleExpanded}
            >
                {title}
                {expanded ? (
                    <CaretUpIcon className='text-inherit' size={24} />
                ) : (
                    <CaretDownIcon className='text-inherit' size={24} />
                )}
            </div>
            <div className={`overflow-y-auto ${expanded ? 'max-h-screen' : 'max-h-0'}`}>
                <div className='flex flex-wrap gap-2'>
                    {Array.isArray(children) &&
                    children.length > 0 &&
                    children.some((item) => item !== null) ? (
                        children
                    ) : (
                        <div className='text-muted-foreground'>No items to display</div>
                    )}
                </div>
            </div>
        </div>
    );
}
