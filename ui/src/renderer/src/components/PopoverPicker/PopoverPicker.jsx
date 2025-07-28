import { useCallback, useEffect, useRef, useState } from 'react';
import { HexColorInput, HexColorPicker } from 'react-colorful';

export const PopoverPicker = ({ color, onChange }) => {
    const buttonRef = useRef();
    const popover = useRef();
    const [isOpen, toggle] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    const close = useCallback(() => toggle(false), []);

    const useClickOutside = (ref, handler) => {
        useEffect(() => {
            let startedInside = false;
            let startedWhenMounted = false;

            const listener = (event) => {
                if (startedInside || !startedWhenMounted) return;
                if (!ref.current || ref.current.contains(event.target)) return;
                handler(event);
            };

            const validateEventStart = (event) => {
                startedWhenMounted = ref.current;
                startedInside = ref.current && ref.current.contains(event.target);
            };

            document.addEventListener('mousedown', validateEventStart);
            document.addEventListener('touchstart', validateEventStart);
            document.addEventListener('click', listener);

            return () => {
                document.removeEventListener('mousedown', validateEventStart);
                document.removeEventListener('touchstart', validateEventStart);
                document.removeEventListener('click', listener);
            };
        }, [ref, handler]);
    };
    useClickOutside(popover, close);

    const openPicker = () => {
        const rect = buttonRef.current.getBoundingClientRect();
        setPosition({
            top: rect.top + window.scrollY + rect.height + 10,
            left: rect.left + window.scrollX,
        });
        toggle(true);
    };

    return (
        <div>
            <span className='flex items-center space-x-4 picker'>
                <HexColorInput
                    color={color}
                    onChange={onChange}
                    className='textarea-ghost-primary textarea-block focus:ring-0 textarea'
                />
                <div
                    ref={buttonRef}
                    className='btn btn-solid-primary my-2'
                    style={{ backgroundColor: color[0] == '#' ? color : `#${color}` }}
                    onClick={openPicker}
                />
            </span>

            {isOpen && (
                <div
                    className='popover'
                    ref={popover}
                    style={{
                        position: 'absolute',
                        zIndex: 1000,
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                    }}
                >
                    <HexColorPicker color={color} onChange={onChange} />
                </div>
            )}
        </div>
    );
};
