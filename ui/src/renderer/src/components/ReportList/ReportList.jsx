import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReportCard from '../ReportCard/ReportCard';
import Pagination from '../Pagination/Pagination';
import { getReports, getReport } from '../../services/publishService/publishService';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import NavbarButton from '../NavbarButton/NavbarButton';
import { PlusCircle } from 'iconoir-react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';

export default function ReportList() {
    const { report_id } = useParams();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const navigate = useNavigate();
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    useEffect(() => {
        fetchReports();
    }, [report_id, page]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            if (report_id) {
                const response = await getReport(report_id);
                setReports([response.data]);
            } else {
                const response = await getReports({ page });
                setReports(response.data.results);
                setTotalPages(response.data.total_pages);
            }
        } catch (error) {
            console.error('Failed to fetch reports', error);
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    const navbarContents = [
        <NavbarButton
            key='new-publish-button'
            text='New Report'
            icon={<PlusCircle />}
            onClick={() => navigate('/publish')}
        />,
    ];

    useNavbarContents(navbarContents, []);

    return (
        <div className='w-full h-full flex flex-col p-6 space-y-3'>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <h1 className='text-3xl font-bold text-white mb-4'>
                {report_id ? 'Report Details' : 'Reports'}
            </h1>

            {loading ? (
                <p className='text-gray-300'>Loading reports...</p>
            ) : reports.length > 0 ? (
                <>
                    {reports.map((report) => (
                        <ReportCard
                            key={report.id}
                            report={report}
                            setAlert={setAlert}
                        />
                    ))}

                    {!report_id && (
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    )}
                </>
            ) : (
                <p className='text-gray-400'>No reports found.</p>
            )}
        </div>
    );
}
