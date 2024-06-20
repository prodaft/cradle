import { useNavigate } from "react-router-dom";
import { createDashboardLink } from "../../utils/dashboardUtils/dashboardUtils";

export default function ListCard({ title, items = [] }) {
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
        </div >
    );
}
