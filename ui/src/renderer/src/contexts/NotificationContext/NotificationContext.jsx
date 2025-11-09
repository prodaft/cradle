import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import AlertDismissible from '../../components/AlertDismissible/AlertDismissible';

/**
 * Context for managing global notifications
 */
const NotificationContext = createContext(null);

/**
 * NotificationProvider component - Provides notification functionality to the entire app
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function NotificationProvider({ children }) {
    const [notification, setNotification] = useState(null);

    /**
     * Display a notification
     *
     * @param {Object} options - Notification options
     * @param {('success'|'error'|'info')} options.type - Type of notification
     * @param {string} [options.background] - Optional custom background color
     * @param {React.ReactNode} [options.icon] - Optional icon component
     * @param {string} [options.title] - Optional notification title
     * @param {string} options.text - Notification message text
     * @param {number} [options.duration] - Duration in milliseconds (default: 3500)
     */
    const notify = useCallback(({ type, background, icon, title, text, duration }) => {
        // Map type to color for backward compatibility with AlertDismissible
        const colorMap = {
            success: 'green',
            error: 'red',
            info: 'gray',
        };

        setNotification({
            show: true,
            type,
            background: background || colorMap[type] || 'gray',
            icon,
            title,
            text,
            duration: duration || 3500,
        });
    }, []);

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({ notify }), [notify]);

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
            {notification && (
                <AlertDismissible
                    alert={{
                        show: notification.show,
                        message: notification.text,
                        color: notification.background,
                        title: notification.title,
                        icon: notification.icon,
                    }}
                    setAlert={() => setNotification(null)}
                    duration={notification.duration}
                />
            )}
        </NotificationContext.Provider>
    );
}

/**
 * Hook to access notification functionality
 * 
 * @returns {{ notify: Function }} - Object containing the notify function
 * 
 * @example
 * const { notify } = useNotif();
 * notify({ type: 'success', text: 'Operation completed!' });
 * notify({ type: 'error', text: 'Something went wrong', title: 'Error' });
 */
export function useNotif() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotif must be used within a NotificationProvider');
    }
    return context;
}


