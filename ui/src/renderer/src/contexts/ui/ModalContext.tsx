/**
 * Modal Context Provider
 * Manages global modal state and rendering
 */

import type { ModalContextValue, ModalData } from '@/types/index';
import { ComponentType, createContext, ReactNode, useContext, useState } from 'react';

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
 * Provides modal functionality to the application
 */
export const ModalProvider = ({ children }: ModalProviderProps): JSX.Element => {
    const [modalData, setModalData] = useState<ModalData>({
        Component: null,
        props: {},
    });

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
            {/* Hidden checkbox is part of RippleUI's modal pattern */}
            <input
                type='checkbox'
                id='global-modal'
                className='modal-state'
                checked={modalData.Component !== null}
                onChange={() => {}}
            />
            <div className='modal w-screen'>
                {/* Clicking the overlay will close the modal */}
                <label
                    htmlFor='global-modal'
                    className='modal-overlay'
                    onClick={closeModal}
                />
                {modalData.Component && (
                    <div className='modal-content cradle-bg-elevated cradle-border p-5'>
                        <modalData.Component
                            {...modalData.props}
                            closeModal={closeModal}
                        />
                    </div>
                )}
            </div>
        </ModalContext.Provider>
    );
};
