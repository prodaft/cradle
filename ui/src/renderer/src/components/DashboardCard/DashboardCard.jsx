import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';

/**
 * DashboardCard component - This component is used to display a simple name card on the dashboard.
 * It can be clicked to navigate to a link.
 * Used for displaying entities, actors and metadata on the dashboard.
 *
 * @function DashboardCard
 * @param {Object} props - The props of the component
 * @param {string} props.name - Name of the entry
 * @param {string} props.link - Link to navigate to when the card is clicked
 * @param {string} props.type - Type of the entry
 * @returns {DashboardCard}
 * @constructor
 */
export default function DashboardCard({ name, link, type }) {
    const { navigate, navigateLink } = useCradleNavigate();
    return (
        <div
            className={`cradle-card cradle-card-hover cradle-card-brackets ${link ? 'cursor-pointer' : ''}`}
            onClick={link ? navigateLink(link) : undefined}
        >
            <div className='cradle-card-body'>
                <div className='cradle-text-primary cradle-mono font-medium mb-2'>
                    {name}
                </div>
                {type && (
                    <div className='cradle-label text-xs'>
                        {type}
                    </div>
                )}
            </div>
        </div>
    );
}
