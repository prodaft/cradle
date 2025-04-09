import React, { useState } from 'react';

function Collapsible({
    label,
    children,
    onChangeCollapse = null,
    open = false,
    buttonText = null,
    onButtonClick = null,
}) {
    const [isOpen, setIsOpen] = useState(open);

    const toggle = () => {
        if (onChangeCollapse) {
            onChangeCollapse(!isOpen);
        }
        setIsOpen((prev) => !prev);
    };

    return (
        <div className="w-full">
            {/* Header with toggle and optional extra button */}
            <div className="flex justify-between items-center">
                <button
                    className="flex items-center text-left dark:text-zinc-300 transition-colors"
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
                    {label}
                </button>
                {/* Extra button rendered only if both text and callback are provided */}
                {buttonText && onButtonClick && (
                    <button onClick={onButtonClick} className="ml-4">
                        {buttonText}
                    </button>
                )}
            </div>

            {/* Underline */}
            <div className="border-b border-zinc-700 mx-3" />

            {/* Collapsible content */}
            {isOpen && <div className="pl-3 pt-1">{children}</div>}
        </div>
    );
}

export default Collapsible;
