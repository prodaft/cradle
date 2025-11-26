/**
 * Notification Context Provider
 * Manages global notifications using sonner toast library
 */

import type { NotificationContextValue, NotificationOptions } from '@/types/index';
import { WarningCircle } from 'iconoir-react';
import { createContext, ReactNode, useCallback, useContext, useMemo } from 'react';
import { toast, Toaster } from 'sonner';

const NotificationContext = createContext<NotificationContextValue | null>(null);

/**
 * Props for NotificationProvider component
 */
export interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * NotificationProvider component
 * Provides notification functionality to the entire app
 */
export function NotificationProvider({ children }: NotificationProviderProps): JSX.Element {
  /**
   * Display a notification
   */
  const notify = useCallback(({ type, title, text, duration }: NotificationOptions): void => {
    const toastOptions = {
      duration: duration || 3500,
    };

    // Use sonner's toast methods based on type
    switch (type) {
      case 'success':
        toast.success(
          title || text,
          title
            ? { ...toastOptions, description: text }
            : toastOptions
        );
        break;
      case 'error':
        toast.error(
          title || text,
          title
            ? { ...toastOptions, description: text, icon: <WarningCircle /> }
            : toastOptions
        );
        break;
      case 'warning':
        toast.warning(
          title || text,
          title
            ? { ...toastOptions, description: text, icon: <WarningCircle /> }
            : toastOptions
        );
        break;
      case 'info':
      default:
        toast.info(
          title || text,
          title ? { ...toastOptions, description: text } : toastOptions
        );
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
 * @returns Object containing the notify function
 * @throws Error if used outside NotificationProvider
 *
 * @example
 * const { notify } = useNotif();
 * notify({ type: 'success', text: 'Operation completed!' });
 * notify({ type: 'error', text: 'Something went wrong', title: 'Error' });
 */
export function useNotif(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotif must be used within a NotificationProvider');
  }
  return context;
}
