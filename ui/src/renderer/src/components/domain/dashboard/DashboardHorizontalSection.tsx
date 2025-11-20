import { NavArrowDown, NavArrowUp } from 'iconoir-react';
import React, { useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

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
    const location = useLocation();
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
        <div className='bg-cradle3 p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full'>
            <div
                className='text-xl font-semibold mb-2 cursor-pointer w-full flex flex-row justify-between items-center'
                onClick={toggleExpanded}
            >
                {title}
                {expanded ? (
                    <NavArrowUp className='text-inherit' height='1.5em' width='1.5em' />
                ) : (
                    <NavArrowDown
                        className='text-inherit'
                        height='1.5em'
                        width='1.5em'
                    />
                )}
            </div>
            <div
                className={`overflow-y-auto ${
                    expanded ? 'max-h-screen' : 'max-h-0'
                }`}
            >
                <div className='flex flex-wrap gap-2'>
                    {Array.isArray(children) && children.length > 0 && children.some((item) => item !== null) ? (
                        children
                    ) : (
                        <div className='text-zinc-500'>No items to display</div>
                    )}
                </div>
            </div>
        </div>
    );
}
