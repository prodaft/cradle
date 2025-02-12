import React, { useState } from 'react';

function Collapsible({ label, children, onChangeCollapse = null, open = false }) {
    const [isOpen, setIsOpen] = useState(open);

    const toggle = () => {
        if (onChangeCollapse) {
            onChangeCollapse(!isOpen);
        }
        setIsOpen((prev) => !prev);
    };

    return (
        <div className='w-full'>
            {/* Summary / Header */}
            <button
                className='flex items-center w-full text-left dark:text-zinc-300 transition-colors'
                onClick={toggle}
            >
                {/* Arrow rotation */}
                <span
                    className={`mr-2 transform transition-transform duration-200 ${
                        isOpen ? 'rotate-90' : ''
                    }`}
                >
                    ▶
                </span>
                <span>{label}</span>
            </button>

            {/* Thin, slightly indented underline */}
            <div className='border-b border-zinc-700 mx-3' />

            {/* Collapsible content */}
            {isOpen && <div className='pl-3 pt-1'>{children}</div>}
        </div>
    );
}

export default Collapsible;
