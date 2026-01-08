import { ReactNode } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdminPageLayoutProps {
    children: ReactNode;
    rightPane?: ReactNode | null;
}

/**
 * Shared layout component for admin pages with resizable panels
 */
export default function AdminPageLayout({ children, rightPane }: AdminPageLayoutProps) {
    return (
        <div className='w-full h-full'>
            <ResizablePanelGroup direction='horizontal' className='h-full'>
                <ResizablePanel defaultSize={70} minSize={50}>
                    <ScrollArea className='h-full'>
                        {children}
                    </ScrollArea>
                </ResizablePanel>
                {rightPane && (
                    <>
                        <ResizableHandle className='w-[2px] bg-card border-x border-border hover:bg-primary hover:bg-opacity-50 transition-colors' />
                        <ResizablePanel defaultSize={30} minSize={20}>
                            <ScrollArea className='max-h-[calc(100vh-5rem)]'>
                                {rightPane}
                            </ScrollArea>
                        </ResizablePanel>
                    </>
                )}
            </ResizablePanelGroup>
        </div>
    );
}
