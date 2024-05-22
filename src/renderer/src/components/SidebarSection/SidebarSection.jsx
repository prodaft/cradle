import React from "react";

/**
 * SidebarSection component - section of the sidebar
 * @param props
 * @param props.sectionType - the type of section (header, content, footer)
 * @param props.justify - the alignment of the items in the section
 * @param props.height - the height of the section
<<<<<<< HEAD
 * @returns {SidebarSection}
=======
 * @returns {Element}
>>>>>>> main
 * @constructor
 */
export default function SidebarSection(props) {
    return (
        <section className={`sidebar-${props.sectionType} justify-${props.justify} h-${props.height}`}>
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