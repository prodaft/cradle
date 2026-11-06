import Logo from '@/components/base/logo/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MoonIcon, SunIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { useTheme } from 'next-themes';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
    children: ReactNode;
}

/**
 * Shared shell for the unauthenticated pages: logo row, a bordered card on
 * desktop (flat on mobile) and the build label underneath.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
    const { resolvedTheme, setTheme } = useTheme();
    const isDarkMode = resolvedTheme === 'dark';

    return (
        <div className='flex min-h-svh w-full flex-col items-center bg-background px-5 pt-16 pb-6 sm:justify-center sm:p-10'>
            <div className='flex w-full max-w-[380px] flex-1 flex-col gap-8 sm:flex-none sm:gap-[22px]'>
                <div className='flex items-center justify-between gap-2'>
                    <Link to='/' className='flex items-center'>
                        <Logo text={true} height='24px' />
                    </Link>
                    <Button
                        onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
                        variant='ghost'
                        size='icon-sm'
                        data-testid='theme-button'
                        aria-label='Toggle theme'
                        title='Toggle theme'
                    >
                        {isDarkMode ? (
                            <SunIcon weight='bold' />
                        ) : (
                            <MoonIcon weight='bold' />
                        )}
                    </Button>
                </div>

                {/* Auth forms use roomier controls than the dense app defaults */}
                <div
                    className={cn(
                        'sm:border sm:bg-card sm:p-7',
                        '[&_[data-slot=input]]:h-12 [&_[data-slot=input-group]]:h-12 [&_[data-slot=input-group-control]]:h-full',
                        '[&_[data-slot=input]]:text-base [&_[data-slot=input-group-control]]:text-base',
                        'sm:[&_[data-slot=input]]:h-10 sm:[&_[data-slot=input-group]]:h-10',
                        'sm:[&_[data-slot=input]]:text-sm sm:[&_[data-slot=input-group-control]]:text-sm',
                        // Full-size buttons only; InputGroupButton carries data-size
                        '[&_[data-slot=button]:not([data-size])]:h-12 [&_[data-slot=button]:not([data-size])]:text-base',
                        'sm:[&_[data-slot=button]:not([data-size])]:h-10 sm:[&_[data-slot=button]:not([data-size])]:text-sm',
                        'sm:[&_[data-slot=field-separator-content]]:bg-card',
                    )}
                >
                    {children}
                </div>

                <p className='mt-auto text-center font-mono text-[11px] text-muted-foreground sm:mt-0'>
                    {__APP_VERSION_LABEL__}
                </p>
            </div>
        </div>
    );
}

interface AuthHeaderProps {
    title: ReactNode;
    description?: ReactNode;
}

export function AuthHeader({ title, description }: AuthHeaderProps) {
    return (
        <div className='flex flex-col gap-0.5'>
            <h1 className='text-[26px] font-semibold tracking-tight sm:text-[22px]'>
                {title}
            </h1>
            {description && (
                <p className='text-sm text-muted-foreground sm:text-[13px]'>
                    {description}
                </p>
            )}
        </div>
    );
}
