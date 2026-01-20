import { ReactNode } from 'react';

interface AdminPageLayoutProps {
    children: ReactNode;
}

/**
 * Shared layout component for admin pages
 */
export default function AdminPageLayout({ children }: AdminPageLayoutProps) {
    return <div className='w-full h-full'>{children}</div>;
}
