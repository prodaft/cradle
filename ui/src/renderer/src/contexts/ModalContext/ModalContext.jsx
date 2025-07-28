import { createContext, useContext, useState } from 'react';

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
    const [modalData, setModalData] = useState({ Component: null, props: {} });

    // Function to show a modal
    const setModal = (Component, props = {}) => {
        setModalData({ Component, props });
    };

    // Function to close the modal
    const closeModal = () => {
        setModalData({ Component: null, props: {} });
    };

    return (
        <ModalContext.Provider value={{ setModal, closeModal }}>
            {children}
            {/* Hidden checkbox is part of RippleUI’s modal pattern */}
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
                <div className='modal-content p-0 w-[100%]'>
                    {modalData.Component && (
                        <div className='modal-content rounded'>
                            {/* Close button */}
                            <button
                                className='btn btn-sm btn-circle btn-ghost modal-close absolute right-2 top-2'
                                onClick={closeModal}
                            >
                                ✕
                            </button>
                            {/* Render the modal component with its props.
                Pass closeModal so the modal content can also close itself if needed */}
                            <modalData.Component
                                {...modalData.props}
                                closeModal={closeModal}
                            />
                        </div>
                    )}
                </div>
            </div>
        </ModalContext.Provider>
    );
};
