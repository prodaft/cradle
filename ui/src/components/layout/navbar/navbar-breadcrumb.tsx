import { useDockPanelActiveForNavbar } from '@/components/layout/dock-panel-tab-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useRouterState } from '@tanstack/react-router';
import { Fragment, useMemo, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

interface BreadcrumbItem {
    /** Null while the page name is still loading. */
    label: string | null;
    to?: string;
}

let slotEl: HTMLElement | null = null;
const slotListeners = new Set<() => void>();

/** Ref callback for the Navbar element that hosts the breadcrumb. */
export function setNavbarBreadcrumbSlot(el: HTMLElement | null): void {
    slotEl = el;
    slotListeners.forEach((listener) => listener());
}

function subscribeSlot(listener: () => void): () => void {
    slotListeners.add(listener);
    return () => slotListeners.delete(listener);
}

/** Labels for static path segments, keyed by the path up to and including them. */
const SEGMENT_LABELS: Record<string, { label: string; link?: boolean }> = {
    '/notes': { label: 'Notes', link: true },
    '/reports': { label: 'Reports', link: true },
    '/files': { label: 'Files', link: true },
    '/digest-data': { label: 'Digest data', link: true },
    '/settings': { label: 'Account settings', link: true },
    '/knowledge-graph': { label: 'Knowledge graph', link: true },
    '/enrichment': { label: 'Enrichment', link: true },
    '/dashboards': { label: 'Dashboards' },
    '/manage': { label: 'Manage', link: true },
    '/manage/users': { label: 'Users', link: true },
    '/manage/entities': { label: 'Entities', link: true },
    '/manage/teams': { label: 'Teams', link: true },
    '/manage/entry-types': { label: 'Entry types', link: true },
    '/manage/type-mappings': { label: 'Type mappings', link: true },
    '/manage/settings': { label: 'Settings', link: true },
    '/manage/enrichment': { label: 'Enrichment', link: true },
};

/**
 * Takes the page name from a "Manage: PTI-1" / "Note: Title" style dock tab title.
 * Pages keep a bare title ("Manage", "Note") until the name has loaded, which yields
 * null.
 */
function pageNameFromTitle(title: string): string | null {
    if (title === 'Not found' || title === 'Restricted note') return title;
    const separator = title.indexOf(': ');
    return separator === -1 ? null : title.slice(separator + 2);
}

function safeDecode(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

function buildBreadcrumb(pathname: string, title: string): BreadcrumbItem[] {
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
        const path = `/${segments.slice(0, index + 1).join('/')}`;
        const known = SEGMENT_LABELS[path];
        if (known) return { label: known.label, to: known.link ? path : undefined };
        const isLast = index === segments.length - 1;
        return { label: isLast ? pageNameFromTitle(title) : safeDecode(segment) };
    });
}

/**
 * Renders the current dock panel's path into the Navbar. Must be rendered inside the
 * panel's router; only the active panel shows its breadcrumb.
 */
export default function NavbarBreadcrumb({ title }: { title: string }) {
    const targetEl = useSyncExternalStore(subscribeSlot, () => slotEl);
    const isNavbarActive = useDockPanelActiveForNavbar();
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const items = useMemo(() => buildBreadcrumb(pathname, title), [pathname, title]);

    if (!targetEl || !isNavbarActive || items.length === 0) return null;

    return createPortal(
        <nav
            aria-label='Breadcrumb'
            className='flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground'
        >
            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                return (
                    <Fragment key={index}>
                        {index > 0 && <span aria-hidden='true'>/</span>}
                        {item.label === null ? (
                            <Skeleton className='h-4 w-24' aria-label='Loading' />
                        ) : isLast ? (
                            <span
                                aria-current='page'
                                className='truncate text-foreground'
                            >
                                {item.label}
                            </span>
                        ) : item.to ? (
                            <Link
                                to={item.to as any}
                                className='shrink-0 hover:text-foreground'
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span className='shrink-0'>{item.label}</span>
                        )}
                    </Fragment>
                );
            })}
        </nav>,
        targetEl,
    );
}
