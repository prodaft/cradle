import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { Card, CardContent } from '@/components/ui/card';

interface DashboardCardProps {
    name: string;
    link?: string;
    type?: string;
}

/**
 * DashboardCard component - This component is used to display a simple name card on the dashboard.
 * It can be clicked to navigate to a link.
 * Used for displaying entities, actors and metadata on the dashboard.
 *
 * @function DashboardCard
 * @param {DashboardCardProps} props - The props of the component
 * @returns {DashboardCard}
 * @constructor
 */
export default function DashboardCard({ name, link, type }: DashboardCardProps) {
    const { navigate, navigateLink } = useCradleNavigate();
    return (
        <Card
            className={`cradle-card-hover cradle-card-brackets ${link ? 'cursor-pointer' : ''}`}
            onClick={link ? navigateLink(link) : undefined}
        >
            <CardContent>
                <div className='cradle-text-primary cradle-mono font-medium mb-2'>
                    {name}
                </div>
                {type && <div className='cradle-label text-xs'>{type}</div>}
            </CardContent>
        </Card>
    );
}
