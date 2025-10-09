import { useEffect, useState } from 'react';
import { PlusCircle, Notes, User, DatabaseBackup, Search, Clock } from 'iconoir-react';
import { StatsReport } from 'iconoir-react/regular';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { getStatistics } from '../../services/statisticsService/statisticsService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { formatDate } from '../../utils/dateUtils/dateUtils';
import { parseMarkdownInline } from '../../utils/customParser/customParser';
import { truncateText } from '../../utils/dashboardUtils/dashboardUtils';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Logo from '../Logo/Logo';

/**
 * RecentItemsCard component displays a list of recent entities or artifacts
 * @param {Object} props - Component props
 */
function RecentItemsCard({ title, items, icon, emptyMessage, onItemClick, color, totalCount }) {
    return (
        <div className='cradle-card h-full'>
            <div className='cradle-card-header flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                    <div className={`${color} p-1.5 rounded`}>{icon}</div>
                    <span className='font-medium'>{title}</span>
                </div>
                <div className={`${color} px-3 py-1 rounded-md`}>
                    <span className='font-bold text-lg'>{totalCount}</span>
                </div>
            </div>
            <div className='cradle-card-body space-y-2'>
                {items.length === 0 ? (
                    <div className='text-center py-8'>
                        <p className='text-sm cradle-text-muted'>{emptyMessage}</p>
                    </div>
                ) : (
                    items.map((item, index) => (
                        <div
                            key={index}
                            onClick={() => onItemClick(item)}
                            className='cradle-card p-3 cursor-pointer hover:border-orange-500'
                        >
                            <div className='flex items-center justify-between'>
                                <span className='cradle-text-primary font-medium truncate'>
                                    {truncateText(item.name || 'Unnamed', 40)}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

/**
 * RecentNotesCard component displays a list of recent notes with titles and metadata
 * @param {Object} props - Component props
 */
function RecentNotesCard({ title, notes, icon, emptyMessage, onNoteClick, color, totalCount }) {
    return (
        <div className='cradle-card h-full'>
            <div className='cradle-card-header flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                    <div className={`${color} p-1.5 rounded`}>{icon}</div>
                    <span className='font-medium'>{title}</span>
                </div>
                <div className={`${color} px-3 py-1 rounded-md`}>
                    <span className='font-bold text-lg'>{totalCount}</span>
                </div>
            </div>
            <div className='cradle-card-body space-y-2'>
                {notes.length === 0 ? (
                    <div className='text-center py-8'>
                        <p className='text-sm cradle-text-muted'>{emptyMessage}</p>
                    </div>
                ) : (
                    notes.map((note, index) => (
                        <div
                            key={index}
                            onClick={() => onNoteClick(note)}
                            className='cradle-card p-3 cursor-pointer hover:border-orange-500'
                        >
                            <div className='space-y-1'>
                                <div className='cradle-text-primary font-medium truncate'>
                                    {truncateText(
                                        parseMarkdownInline(note.metadata?.title || 'Untitled'),
                                        50
                                    )}
                                </div>
                                <div className='flex items-center gap-3 text-xs cradle-text-tertiary'>
                                    <div className='flex items-center gap-1'>
                                        <User width={12} height={12} />
                                        <span>{note.author?.username || 'Unknown'}</span>
                                    </div>
                                    <div className='flex items-center gap-1'>
                                        <Clock width={12} height={12} />
                                        <span>{formatDate(new Date(note.timestamp))}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

/**
 * The Welcome component is the landing page of the application.
 * It displays a modern dashboard with quick actions, statistics, and recent activity.
 *
 * @function Welcome
 * @returns {Welcome}
 * @constructor
 */
export default function Welcome() {
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [artifacts, setArtifacts] = useState([]);
    const [entities, setEntities] = useState([]);
    const [notes, setNotes] = useState([]);
    const { navigate, navigateLink } = useCradleNavigate();

    useEffect(() => {
        getStatistics()
            .then((response) => {
                const { artifacts, entities, notes } = response.data;
                setArtifacts(artifacts);
                setEntities(entities);
                setNotes(notes);
            })
            .catch(displayError(setAlert, navigate));
    }, []);

    const quickActions = [
        {
            title: 'New Note',
            description: 'Create a new note',
            icon: <PlusCircle width={24} height={24} />,
            onClick: navigateLink('/editor/new'),
            color: 'cradle-status-success'
        },
        {
            title: 'Browse Notes',
            description: 'View all notes',
            icon: <Notes width={24} height={24} />,
            onClick: navigateLink('/documents'),
            color: 'cradle-status-info'
        },
        {
            title: 'Graph Search',
            description: 'Explore connections',
            icon: <Search width={24} height={24} />,
            onClick: navigateLink('/graph-search'),
            color: 'cradle-status-warning'
        },
        {
            title: 'Analytics',
            description: 'View statistics',
            icon: <StatsReport width={24} height={24} />,
            onClick: navigateLink('/dashboard'),
            color: 'cradle-status-info'
        }
    ];

    return (
        <>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <div className='h-full w-full overflow-auto cradle-bg-primary'>
                {/* Header Section */}
                <div className='cradle-border-b px-6 py-8'>
                    <div className='max-w-7xl mx-auto'>
                        <div className='flex items-center justify-between'>
                            <div>
                                <h1 className='text-4xl font-medium cradle-text-primary cradle-mono tracking-tight mb-2'>
                                    Knowledge System
                                </h1>
                                <p className='text-sm cradle-text-tertiary uppercase tracking-wider'>
                                    Welcome to your knowledge workspace
                                </p>
                            </div>
                            <div className='hidden md:block'>
                                <Logo text={false} width='120px' />
                            </div>
                        </div>
                    </div>
                </div>

                <div className='max-w-7xl mx-auto px-6 py-8'>
                    {/* Quick Actions */}
                    <div className='mb-12'>
                        <h2 className='text-xl font-medium cradle-text-primary cradle-mono mb-6'>
                            Quick Actions
                        </h2>
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                            {quickActions.map((action, index) => (
                                <button
                                    key={index}
                                    onClick={action.onClick}
                                    className='cradle-card p-6 text-left hover:border-orange-500'
                                >
                                    <div className='flex items-center gap-3 mb-3'>
                                        <div className={`${action.color} p-2 rounded-md`}>
                                            {action.icon}
                                        </div>
                                        <h3 className='font-medium cradle-text-primary'>
                                            {action.title}
                                        </h3>
                                    </div>
                                    <p className='text-sm cradle-text-tertiary'>
                                        {action.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div>
                        <h2 className='text-xl font-medium cradle-text-primary cradle-mono mb-6'>
                            Recent Activity
                        </h2>
                        
                        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                            {/* Recent Entities */}
                            <RecentItemsCard
                                title='Recent Entities'
                                items={entities.slice(0, 5)}
                                totalCount={entities.length}
                                icon={<User width={18} height={18} />}
                                emptyMessage='No entities yet'
                                onItemClick={(item) => navigateLink(`/entities/${item.id}`)}
                                color='cradle-status-success'
                            />

                            {/* Recent Artifacts */}
                            <RecentItemsCard
                                title='Recent Artifacts'
                                items={artifacts.slice(0, 5)}
                                totalCount={artifacts.length}
                                icon={<DatabaseBackup width={18} height={18} />}
                                emptyMessage='No artifacts yet'
                                onItemClick={(item) => navigateLink(`/artifacts/${item.id}`)}
                                color='cradle-status-warning'
                            />

                            {/* Recent Notes */}
                            <RecentNotesCard
                                title='Recent Notes'
                                notes={notes.slice(0, 5)}
                                totalCount={notes.length}
                                icon={<Notes width={18} height={18} />}
                                emptyMessage='No notes yet'
                                onNoteClick={(note) => navigateLink(`/notes/${note.id}`)}
                                color='cradle-status-info'
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className='cradle-border-t mt-16'>
                    <div className='max-w-7xl mx-auto px-6 py-6'>
                        <div className='flex flex-col items-center'>
                            <p
                                className='text-sm cradle-text-muted cursor-pointer'
                                onClick={() => window.open('https://prodaft.com')}
                            >
                                Copyright &copy; 2025 PRODAFT | v2.10.2
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
