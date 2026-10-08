import { Outlet } from '@tanstack/react-router';

/**
 * Layout for the enrichment section: renders child routes (list at /enrichment, detail at /enrichment/$id).
 */
export default function EnrichmentLayout() {
    return (
        <div className='w-full h-full'>
            <Outlet />
        </div>
    );
}
