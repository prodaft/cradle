import { useNavigate } from 'react-router-dom';
import { createDashboardLink } from '../../utils/dashboardUtils/dashboardUtils';

/**
 * This component is a card component that displays a list of items.
 * Each item in the list is displayed as a clickable card.
 * When an item is clicked, the user is navigated to the corresponding dashboard.
 * It is used to display lists of entities such as actors and cases.
 *
 * @param {Object} props - The props of the component.
 * @param {string} props.title - The title of the list.
 * @param {Object[]} props.items - The list of items to display.
 * @returns {ListCard}
 */
export default function EntityListCard({ title, items = [] }) {
    const navigate = useNavigate();
    return (
        <div className='card bg-gray-2 overflow-auto !max-w-none'>
            <div className='card-body'>
                <h2 className='card-header'>{title}</h2>
                {items.map((item, index) => {
                    return (
                        <div
                            key={index}
                            className='opacity-90 hover:opacity-70 active:opacity-50 hover:cursor-pointer card p-4 
                            bg-gray-4 hover:bg-gray-6 active:bg-gray-8 !max-w-none'
                            onClick={() => navigate(createDashboardLink(item))}
                        >
                            <p className='card-title'>{item.name}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
