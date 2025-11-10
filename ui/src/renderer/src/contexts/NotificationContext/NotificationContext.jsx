import { WarningCircle } from 'iconoir-react';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { toast, Toaster } from 'sonner';

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
    /**
     * Display a notification
     *
     * @param {Object} options - Notification options
     * @param {('success'|'error'|'info')} options.type - Type of notification
     * @param {string} options.title - Notification title
     * @param {string} options.text - Notification message text
     * @param {number} [options.duration] - Duration in milliseconds (default: 3500)
     */
    const notify = useCallback(({ type, title, text, duration }) => {
        const toastOptions = {
            duration: duration || 3500,
        };

        // Use sonner's toast methods based on type
        switch (type) {
            case 'success':
                toast.success(title || text, title ? { ...toastOptions, description: text, icon: <CheckSolid /> } : toastOptions);
                break;
            case 'error':
                toast.error(title || text, title ? { ...toastOptions, description: text, icon: <WarningCircle /> } : toastOptions);
                break;
            case 'info':
            default:
                toast.info(title || text, title ? { ...toastOptions, description: text, icon: <InfoEmpty /> } : toastOptions);
                break;
        }
    }, []);

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({ notify }), [notify]);

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
            <Toaster
                position="bottom-right"
                closeButton={false}
                richColors={false}
                toastOptions={{
                    classNames: {
                        toast: 'cradle-toast',
                        title: 'cradle-toast-title',
                        description: 'cradle-toast-description',
                        actionButton: 'cradle-toast-action',
                        cancelButton: 'cradle-toast-cancel',
                    },
                }}
            />
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


