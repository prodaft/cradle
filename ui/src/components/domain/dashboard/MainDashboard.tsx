import PageHeader from '@/components/base/PageHeader';

/**
 * The MainDashboard component is the main dashboard page of the application.
 */
export default function MainDashboard() {
    return (
        <div className='h-full w-full overflow-auto bg-background'>
            <PageHeader
                title='Dashboard'
                description='Overview of your intelligence workspace'
            />
        </div>
    );
}
