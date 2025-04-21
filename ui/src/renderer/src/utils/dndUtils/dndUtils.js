import 'tailwindcss/tailwind.css';

import { PointerSensor } from '@dnd-kit/core';

export class NoButtonsSensor extends PointerSensor {
    static activators = [
        {
            eventName: 'onPointerDown',
            handler: ({ nativeEvent: event }) => {
                if (
                    !event.isPrimary ||
                    event.button !== 0 ||
                    isInteractiveElement(event.target, 2)
                ) {
                    return false;
                }

                return true;
            },
        },
    ];
}

function isInteractiveElement(element, depth) {
    if (depth == 0 || element == null) return false;

    const interactiveElements = ['button', 'input', 'textarea', 'select', 'option'];

    if (interactiveElements.includes(element.tagName.toLowerCase())) {
        return true;
    }

    return isInteractiveElement(element.parentElement, depth - 1);
}
