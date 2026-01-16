import { cn } from '@/lib/utils';
import { Link, useMatchRoute } from '@tanstack/react-router';

export interface NavItem {
    to: string;
    label: string;
    exact?: boolean;
}

export interface MainNavProps {
    items: NavItem[];
    className?: string;
}

/**
 * MainNav - Router-compatible navigation component
 * Provides active state highlighting based on current route
 */
export function MainNav({ items, className }: MainNavProps) {
    const matchRoute = useMatchRoute();

    return (
        <nav className={cn('flex items-center gap-2', className)}>
            {items.map((item) => {
                const isActive = matchRoute({ to: item.to, fuzzy: !item.exact });

                return (
                    <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                            'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors',
                            'hover:bg-accent hover:text-accent-foreground',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isActive && 'bg-accent text-accent-foreground font-medium',
                        )}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
