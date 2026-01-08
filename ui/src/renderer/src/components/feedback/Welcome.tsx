import { useAPICall } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatisticsNote } from '@/services/cradle';
import Logo from '@components/base/Logo/Logo';
import { useProfile } from '@contexts/user/ProfileContext';
import useApi from '@hooks/api/useApi';
import useCradleNavigate from '@hooks/navigation/useCradleNavigate';
import { truncateText } from '@utils/dashboard';
import { formatDate } from '@utils/dates';
import { parseMarkdownInline } from '@utils/parser/parse';
import { Sparks } from 'iconoir-react';
import {
    Clock,
    DatabaseBackup,
    Notes,
    PlusCircle,
    Search,
    User,
} from 'iconoir-react/regular';
import { ReactNode, useEffect, useState } from 'react';

interface ItemWithName {
    name: string;
    subtype: string;
}

interface RecentItemsCardProps {
    title: string;
    items: ItemWithName[];
    icon: ReactNode;
    emptyMessage: string;
    onItemClick: (item: ItemWithName) => (e: React.MouseEvent) => void;
    color: string;
    totalCount: number;
}

interface RecentNotesCardProps {
    title: string;
    notes: StatisticsNote[];
    icon: ReactNode;
    emptyMessage: string;
    onNoteClick: (note: StatisticsNote) => (e: React.MouseEvent) => void;
    color: string;
    totalCount: number;
}

interface QuickAction {
    title: string;
    description: string;
    icon: ReactNode;
    onClick: (() => void) | ((e: React.MouseEvent) => void);
    color: string;
}

/**
 * RecentItemsCard component displays a list of recent entities or artifacts
 */
function RecentItemsCard({
    title,
    items,
    icon,
    emptyMessage,
    onItemClick,
    color,
    totalCount,
}: RecentItemsCardProps) {
    return (
        <Card className='h-full'>
            <CardHeader>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                        <div className={`${color} p-1.5 rounded`}>{icon}</div>
                        <CardTitle className='font-medium'>{title}</CardTitle>
                    </div>
                    <div className={`${color} px-3 py-1 rounded-md`}>
                        <span className='font-bold text-lg'>{totalCount}</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className='space-y-2'>
                {items.length === 0 ? (
                    <div className='text-center py-8'>
                        <p className='text-sm cradle-text-muted'>{emptyMessage}</p>
                    </div>
                ) : (
                    items.map((item, index) => (
                        <Card
                            key={index}
                            className='p-3 cursor-pointer hover:bg-cradle-bg-secondary transition-colors'
                            onClick={onItemClick(item)}
                        >
                            <CardContent className='p-0'>
                                <div className='flex items-center justify-between'>
                                    <span className='cradle-text-primary font-medium truncate'>
                                        {truncateText(item.name || 'Unnamed', 40)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

/**
 * RecentNotesCard component displays a list of recent notes with titles and metadata
 */
function RecentNotesCard({
    title,
    notes,
    icon,
    emptyMessage,
    onNoteClick,
    color,
    totalCount,
}: RecentNotesCardProps) {
    return (
        <Card className='h-full'>
            <CardHeader>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                        <div className={`${color} p-1.5 rounded`}>{icon}</div>
                        <CardTitle className='font-medium'>{title}</CardTitle>
                    </div>
                    <div className={`${color} px-3 py-1 rounded-md`}>
                        <span className='font-bold text-lg'>{totalCount}</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className='space-y-2'>
                {notes.length === 0 ? (
                    <div className='text-center py-8'>
                        <p className='text-sm cradle-text-muted'>{emptyMessage}</p>
                    </div>
                ) : (
                    notes.map((note, index) => (
                        <Card
                            key={index}
                            className='p-3 cursor-pointer hover:bg-cradle-bg-secondary transition-colors'
                            onClick={onNoteClick(note)}
                        >
                            <CardContent className='p-0'>
                                <div className='space-y-1'>
                                    <div className='cradle-text-primary font-medium truncate'>
                                        {truncateText(
                                            parseMarkdownInline(
                                                note.title || 'Untitled',
                                            ),
                                            50,
                                        )}
                                    </div>
                                    <div className='flex items-center gap-3 text-xs cradle-text-tertiary'>
                                        <div className='flex items-center gap-1'>
                                            <User width={12} height={12} />
                                            <span>
                                                {note.author?.username || 'Unknown'}
                                            </span>
                                        </div>
                                        <div className='flex items-center gap-1'>
                                            <Clock width={12} height={12} />
                                            <span>
                                                {formatDate(new Date(note.timestamp))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

/**
 * The Welcome component is the landing page of the application.
 * It displays a modern dashboard with quick actions, statistics, and recent activity.
 */
export default function Welcome() {
    const { execute } = useAPICall();
    const [artifacts, setArtifacts] = useState<ItemWithName[]>([]);
    const [entities, setEntities] = useState<ItemWithName[]>([]);
    const [notes, setNotes] = useState<StatisticsNote[]>([]);
    const { navigate, navigateLink } = useCradleNavigate();
    const { profile } = useProfile();
    const { fleetingNotesApi, statisticsApi } = useApi();

    useEffect(() => {
        (async () => {
            const response = await execute(() => statisticsApi.statisticsRetrieve(), {
                errorMessage: 'Failed to load statistics',
            });
            const { artifacts, entities, notes } = response;
            setArtifacts(artifacts || []);
            setEntities(entities || []);
            setNotes(notes || []);
        })();
    }, []);

    const handleCreateNewNote = async () => {
        const defaultContent =
            profile?.defaultNoteTemplate ||
            '# Untitled\n\nStart writing your note here...';
        const response = await execute(
            () =>
                fleetingNotesApi.fleetingNotesCreate({
                    fleetingNoteRequest: {
                        content: defaultContent,
                    },
                }),
            {
                errorMessage: 'Failed to create note',
            },
        );
        navigate(`/notes/${response.id}`);
    };

    const quickActions: QuickAction[] = [
        {
            title: 'New Note',
            description: 'Create a new note',
            icon: <PlusCircle width={24} height={24} />,
            onClick: handleCreateNewNote,
            color: 'cradle-status-success',
        },
        {
            title: 'Browse Notes',
            description: 'View all notes',
            icon: <Notes width={24} height={24} />,
            onClick: navigateLink('/notes'),
            color: 'cradle-status-info',
        },
        {
            title: 'Graph Search',
            description: 'Explore connections',
            icon: <Search width={24} height={24} />,
            onClick: navigateLink('/knowledge-graph'),
            color: 'cradle-status-warning',
        },
        {
            title: 'Enrich Artifacts',
            description: 'Enrich IOCs with external sources',
            icon: <Sparks width={24} height={24} />,
            onClick: navigateLink('/enrich'),
            color: 'cradle-status-warning',
        },
    ];

    return (
        <>
            <div className='h-full w-full overflow-auto cradle-bg-primary'>
                {/* Header Section */}
                <div className='cradle-border-b px-6 py-8'>
                    <div className='max-w-7xl mx-auto'>
                        <div className='flex items-center justify-between'>
                            <div>
                                <h1 className='text-4xl font-medium cradle-text-primary cradle-mono tracking-tight mb-2'>
                                    CRADLE
                                </h1>
                                <p className='text-sm cradle-text-tertiary uppercase tracking-wider'>
                                    Welcome to your intelligence workspace
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
                                <Card
                                    key={index}
                                    className='p-6 text-left hover:bg-cradle-bg-secondary transition-colors cursor-pointer h-auto'
                                    onClick={action.onClick}
                                >
                                    <CardContent className='p-0'>
                                        <div className='flex items-center gap-3 mb-3'>
                                            <div
                                                className={`${action.color} p-2 rounded-md`}
                                            >
                                                {action.icon}
                                            </div>
                                            <h3 className='font-medium cradle-text-primary'>
                                                {action.title}
                                            </h3>
                                        </div>
                                        <p className='text-sm cradle-text-tertiary'>
                                            {action.description}
                                        </p>
                                    </CardContent>
                                </Card>
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
                                onItemClick={(item) =>
                                    navigateLink(
                                        `/dashboards/${item.subtype}/${item.name}`,
                                    )
                                }
                                color='cradle-status-success'
                            />

                            {/* Recent Artifacts */}
                            <RecentItemsCard
                                title='Recent Artifacts'
                                items={artifacts.slice(0, 5)}
                                totalCount={artifacts.length}
                                icon={<DatabaseBackup width={18} height={18} />}
                                emptyMessage='No artifacts yet'
                                onItemClick={(item) =>
                                    navigateLink(
                                        `/dashboards/${item.subtype}/${item.name}`,
                                    )
                                }
                                color='cradle-status-warning'
                            />

                            {/* Recent Notes */}
                            <RecentNotesCard
                                title='Recent Notes'
                                notes={notes.slice(0, 5)}
                                totalCount={notes.length}
                                icon={<Notes width={18} height={18} />}
                                emptyMessage='No notes yet'
                                onNoteClick={(note) =>
                                    navigateLink(`/notes/${note.id}`)
                                }
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
                                Copyright &copy; 2025 PRODAFT | v2.10.2-beta.a070af1b
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
