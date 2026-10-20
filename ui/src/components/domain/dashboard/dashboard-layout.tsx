import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import { type ComponentType, type ReactNode, useEffect, useRef } from 'react';

interface DashboardTab {
    id: string;
    label: string;
    icon: ComponentType;
}

interface DashboardLayoutProps {
    /** Shown before the title, e.g. the entry subtype. */
    prefix?: string;
    title?: string;
    description?: ReactNode;
    /** Right side of the header. */
    actions?: ReactNode;
    tabs: DashboardTab[];
    /** Active tab id; changes are written to the `tab` search param. */
    tab: string;
    /** Scroll back to the top when this changes. */
    resetScrollKey?: unknown;
    /** Content of the active tab; the tab bar is hidden without it. */
    children?: ReactNode;
}

/** Shared layout of the entry and file dashboards: header, tab bar and tab content. */
export default function DashboardLayout({
    prefix,
    title,
    description,
    actions,
    tabs,
    tab,
    resetScrollKey,
    children,
}: DashboardLayoutProps) {
    const router = useRouter();
    const search = useSearch({ strict: false });
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const dashboard = useRef<HTMLDivElement>(null);

    const changeTab = (tabId: string) => {
        router.navigate({
            to: pathname as any,
            search: { ...(search as any), tab: tabId },
            replace: true,
        });
    };

    useEffect(() => {
        if (dashboard.current) {
            dashboard.current.scrollTo(0, 0);
        }
    }, [resetScrollKey]);

    return (
        <>
            <div
                className='w-full h-full flex justify-center items-start overflow-x-hidden overflow-y-auto'
                ref={dashboard}
            >
                <div className='w-full min-h-full flex flex-col p-6 space-y-4 overflow-hidden'>
                    {title && (
                        <div className='flex justify-between items-center gap-4 w-full border-b border-border pr-4 pb-4'>
                            <div className='flex flex-col min-w-0'>
                                <h1 className='text-3xl font-medium break-all text-foreground tracking-tight'>
                                    {prefix && (
                                        <span className='text-muted-foreground text-2xl mr-2'>{`${prefix}:`}</span>
                                    )}
                                    {title}
                                </h1>
                                {description && (
                                    <div className='text-sm text-foreground mt-2'>
                                        {description}
                                    </div>
                                )}
                            </div>
                            {actions}
                        </div>
                    )}
                    {children && (
                        <div className='flex flex-1 flex-col space-y-4 overflow-hidden'>
                            <Tabs value={tab} onValueChange={changeTab}>
                                <TabsList className='flex-nowrap overflow-x-auto overflow-y-hidden w-full md:w-fit min-w-0 h-auto justify-start md:justify-center [&>button]:shrink-0 [&>button]:flex-none'>
                                    {tabs.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <TabsTrigger key={item.id} value={item.id}>
                                                <Icon />
                                                {item.label}
                                            </TabsTrigger>
                                        );
                                    })}
                                </TabsList>
                            </Tabs>
                            <ScrollArea className='faded-bottom h-full w-full pb-12'>
                                {children}
                                <ScrollBar orientation='horizontal' />
                            </ScrollArea>
                        </div>
                    )}
                </div>
            </div>
            <div className='w-full h-8' />
        </>
    );
}
