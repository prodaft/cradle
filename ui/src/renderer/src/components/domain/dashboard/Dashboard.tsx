import { Card, CardContent } from '@/components/ui/card';
import useApi from '@/hooks/api/useApi';
import { useMutation } from '@tanstack/react-query';
import { useLoaderData, useRouter } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import Files from './Files';
import Notes from './Notes';
import Relations from './Relations';

/**
 * Dashboard component
 * Fetches and displays the dashboard data for an entry
 * If the entry does not exist, displays a 404 page
 * The dashboard displays the entry's name, type, description, related actors, entities, artifacts, metadata, and notes
 * The dashboard only displays the fields provided by the server, different entries may have different fields
 * If the user is an admin, a delete button is displayed in the navbar
 * If the user is not in publish mode, a button to enter publish mode is displayed in the navbar
 * If the entry is linked to entities to which the user does not have access to, a button to request access to view them is displayed
 * If the entry is an artifact, a button to search the artifact name on VirusTotal is displayed
 *
 * @function Dashboard
 * @returns {Dashboard}
 * @constructor
 */
export default function Dashboard() {
    const loaderData = useLoaderData({
        from: '/_authenticated/dashboards/$subtype/$name',
    });
    const contentObject = loaderData?.entry || undefined;
    const { entriesApi } = useApi();
    const router = useRouter();
    const dashboard = useRef<HTMLDivElement>(null);

    const deleteEntityMutation = useMutation({
        mutationFn: async (entityId: number) => {
            await entriesApi.entitiesDestroy({ entityId });
        },
        meta: {
            successMessage: 'Entity deleted successfully.',
        },
        onSuccess: () => {
            router.navigate({ to: '/' });
        },
    });

    // Scroll to top on mount
    useEffect(() => {
        if (dashboard.current) {
            dashboard.current.scrollTo(0, 0);
        }
    }, [contentObject]);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleDelete = () => {
        if (!contentObject) return;
        // Only entities can be deleted (not artifacts)
        if (contentObject.type !== 'entity') {
            toast.error('Only entities can be deleted.');
            return;
        }
        if (contentObject.id) {
            deleteEntityMutation.mutate(contentObject.id);
        }
    };

    return (
        <>
            <div
                className='w-full h-full flex justify-center items-center overflow-x-hidden overflow-y-hidden'
                ref={dashboard}
            >
                <div className='w-full h-full flex flex-col p-6 space-y-4'>
                    {contentObject.name && (
                        <div className='flex justify-between items-center w-full border-b border-border px-4 pb-4'>
                            <div>
                                <h1 className='text-3xl font-medium break-all text-foreground font-mono tracking-wide tracking-tight'>
                                    {contentObject.type && (
                                        <span className='text-muted-foreground text-2xl mr-2'>{`${contentObject.subtype ? contentObject.subtype : contentObject.type}:`}</span>
                                    )}
                                    {contentObject.name}
                                </h1>
                                {contentObject.description && (
                                    <p className='text-sm text-foreground mt-2 font-mono tracking-wide'>
                                        {contentObject.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    {contentObject.id && (
                        <Card>
                            <CardContent className='flex flex-col space-y-4 pt-4'>
                                <div>
                                    <h2 className='text-lg font-semibold mb-4'>
                                        Notes
                                    </h2>
                                    <Notes obj={contentObject} />
                                </div>
                                <div>
                                    <h2 className='text-lg font-semibold mb-4'>
                                        Relations
                                    </h2>
                                    <Relations obj={contentObject} />
                                </div>
                                <div>
                                    <h2 className='text-lg font-semibold mb-4'>
                                        Files
                                    </h2>
                                    <Files obj={contentObject} />
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
            <div className='w-full h-8' />
        </>
    );
}
