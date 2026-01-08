import { ReactNode } from 'react';

/**
 * Section type variants
 */
export type SidebarSectionType = 'header' | 'content' | 'footer';

/**
 * Justify alignment options
 */
export type SidebarSectionJustify = 'start' | 'end';

/**
 * Height options
 */
export type SidebarSectionHeight = 'fit' | 'full';

/**
 * SidebarSection component props
 */
export interface SidebarSectionProps {
    /** Type of section */
    sectionType: SidebarSectionType;
    /** Alignment of items in the section */
    justify: SidebarSectionJustify;
    /** Height of the section */
    height: SidebarSectionHeight;
    /** Children to display in the section */
    children: ReactNode;
}

/**
 * SidebarSection component - section of the sidebar
 *
 * @example
 * ```tsx
 * <SidebarSection sectionType="header" justify="start" height="fit">
 *   <SidebarItem icon={<HomeIcon />} text="Home" onClick={handleHome} />
 * </SidebarSection>
 * ```
 */
export default function SidebarSection({
    sectionType,
    justify,
    height,
    children,
}: SidebarSectionProps): JSX.Element {
    const sectionVariants: Record<SidebarSectionType, string> = {
        header: 'sidebar-header',
        content: 'sidebar-content',
        footer: 'sidebar-footer',
    };

    const justifyVariants: Record<SidebarSectionJustify, string> = {
        start: 'justify-start',
        end: 'justify-end',
    };

    const heightVariants: Record<SidebarSectionHeight, string> = {
        fit: 'h-fit',
        full: 'h-full',
    };

    return (
        <section
            className={`${sectionVariants[sectionType]} ${justifyVariants[justify]} ${heightVariants[height]}`}
        >
            <nav className='menu rounded-md'>
                <section className='menu-section gap-0'>
                    <ul className='cradle-menu-items'>{children}</ul>
                </section>
            </nav>
        </section>
    );
}
