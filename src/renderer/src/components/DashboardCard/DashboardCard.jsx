import { useNavigate } from 'react-router-dom';

/**
 * DashboardCard component - This component is used to display a simple name card on the dashboard.
 * It can be clicked to navigate to a link.
 * Used for displaying cases, actors and metadata on the dashboard.
 * @param {string} name - Name of the entity
 * @param {string} link - Link to navigate to when the card is clicked
 * @param {string} type - Type of the entity
 * @returns {DashboardCard}
 * @constructor
 */
export default function DashboardCard({ name, link, type }) {
    const navigate = useNavigate();
    const handleClick = () => {
        if (link) navigate(link);
    };
    return (
        <div
            className={`bg-cradle3 p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg shadow-md rounded-xl ${link ? 'cursor-pointer' : ''}`}
            onClick={handleClick}
        >
            {name}
            <div className='text-zinc-300'>{type ? type : ''}</div>
        </div>
    );
}
