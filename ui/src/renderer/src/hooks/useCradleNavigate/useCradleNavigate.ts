import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const useCradleNavigate = () => {
    const navigate = useNavigate();

    const smartNavigate = useCallback(
        (to, options = {}) => {
            // If event is passed in options
            const event = options.event;

            if (event && (event.ctrlKey || event.metaKey)) {
                // Ctrl/Cmd + click: open in new window
                const url = typeof to === 'string' ? '#' + to : to.pathname || to;
                window.open(url, '_blank');
            } else {
                // Normal click or programmatic navigation: use React Router navigation
                const { event: _, ...navOptions } = options; // Remove event from options before passing to navigate
                navigate(to, navOptions);
            }
        },
        [navigate],
    );

    return {
        navigate: smartNavigate,
        navigateLink: (to) => (e) => {
            e.stopPropagation();
            e.preventDefault();
            smartNavigate(to, { event: e });
        },
    };
};

export default useCradleNavigate;
