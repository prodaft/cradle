/**
 * Modal Context Provider
 * Manages global modal state and rendering using shadcn Dialog
 */

import type { ModalContextValue, ModalData } from '@/types/index';
import React, { ComponentType, createContext, ReactNode, useContext, useState } from 'react';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';

const ModalContext = createContext<ModalContextValue | undefined>(undefined);

/**
 * Props for ModalProvider component
 */
export interface ModalProviderProps {
    children: ReactNode;
}

/**
 * Hook to access modal context
 *
 * @returns Modal context value
 * @throws Error if used outside ModalProvider
 */
export const useModal = (): ModalContextValue => {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within ModalProvider');
    }
    return context;
};

/**
 * ModalProvider component
 * Provides modal functionality to the application using shadcn Dialog
 */
export const ModalProvider = ({ children }: ModalProviderProps): React.JSX.Element => {
    const [modalData, setModalData] = useState<ModalData>({
        Component: null,
        props: {},
    });

    const isOpen = modalData.Component !== null;

    /**
     * Show a modal with the specified component and props
     *
     * @param Component - Modal component to render (must accept closeModal prop)
     * @param props - Props to pass to the modal component (excluding closeModal which is auto-injected)
     */
    const setModal = <TProps extends { closeModal: () => void }>(
        Component: ComponentType<TProps>,
        props?: Omit<TProps, 'closeModal'>,
    ): void => {
        setModalData({ Component, props: props || {} } as ModalData);
    };

    /**
     * Close the currently open modal
     */
    const closeModal = (): void => {
        setModalData({ Component: null, props: {} });
    };

    return (
        <ModalContext.Provider value={{ setModal, closeModal }}>
            {children}
            <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
                <DialogContent>
                {modalData.Component && (
                        <modalData.Component
                            {...modalData.props}
                            closeModal={closeModal}
                        />
                )}
                </DialogContent>
            </Dialog>
        </ModalContext.Provider>
    );
};
