import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@tanstack/react-router';

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
    if (link) {
        return (
            <Link to={link as any} className='block'>
                <Card className='transition-colors hover:border-ring hover:shadow-md cursor-pointer'>
                    <CardContent>
                        <div className='text-foreground font-mono tracking-wide font-medium mb-2'>
                            {name}
                        </div>
                        {type && (
                            <div className='text-xs uppercase tracking-widest font-semibold text-muted-foreground'>
                                {type}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </Link>
        );
    }

    return (
        <Card className='transition-colors hover:border-ring hover:shadow-md'>
            <CardContent>
                <div className='text-foreground font-mono tracking-wide font-medium mb-2'>
                    {name}
                </div>
                {type && (
                    <div className='text-xs uppercase tracking-widest font-semibold text-muted-foreground'>
                        {type}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
