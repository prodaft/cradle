import React from "react";

/**
 * SidebarSection component - section of the sidebar
 * @param props
 * @param props.sectionType - the type of section (header, content, footer)
 * @param props.justify - the alignment of the items in the section
 * @param props.height - the height of the section
 * @returns {SidebarSection}
 * @constructor
 */
export default function SidebarSection(props) {
    const sectionVariants = {
        header: 'sidebar-header',
        content: 'sidebar-content',
        footer: 'sidebar-footer',
    }

    const justifyVariants = {
        start: 'justify-start',
        end: 'justify-end',
    }

    const heightVariants = {
        fit: 'h-fit',
        full: 'h-full',
    }

    return (
        <section className={`${sectionVariants[props.sectionType]} ${justifyVariants[props.justify]} ${heightVariants[props.height]}`}>
            <nav className="menu rounded-md">
                <section className="menu-section gap-2">
                    <ul className="menu-items">
                        {props.children}
                    </ul>
                </section>
            </nav>
        </section>
    );
}