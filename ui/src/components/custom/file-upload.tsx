'use client';

import { useAsRef } from '@/hooks/use-as-ref';
import { useLazyRef } from '@/hooks/use-lazy-ref';
import { cn } from '@/lib/utils';
import { useDirection } from '@radix-ui/react-direction';
import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

const ROOT_NAME = 'FileUpload';
const DROPZONE_NAME = 'FileUploadDropzone';
const TRIGGER_NAME = 'FileUploadTrigger';
const CLEAR_NAME = 'FileUploadClear';

type Direction = 'ltr' | 'rtl';

interface FileState {
    file: File;
    progress: number;
    error?: string;
    status: 'idle' | 'uploading' | 'error' | 'success';
}

interface StoreState {
    files: Map<File, FileState>;
    dragOver: boolean;
    invalid: boolean;
}

type StoreAction =
    | { type: 'ADD_FILES'; files: File[] }
    | { type: 'SET_FILES'; files: File[] }
    | { type: 'SET_PROGRESS'; file: File; progress: number }
    | { type: 'SET_SUCCESS'; file: File }
    | { type: 'SET_ERROR'; file: File; error: string }
    | { type: 'SET_DRAG_OVER'; dragOver: boolean }
    | { type: 'SET_INVALID'; invalid: boolean }
    | { type: 'CLEAR' };

type Store = {
    getState: () => StoreState;
    dispatch: (action: StoreAction) => void;
    subscribe: (listener: () => void) => () => void;
};

const StoreContext = React.createContext<Store | null>(null);

function useStoreContext(consumerName: string) {
    const context = React.useContext(StoreContext);
    if (!context) {
        throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
    }
    return context;
}

function useStore<T>(selector: (state: StoreState) => T): T {
    const store = useStoreContext('useStore');

    const lastValueRef = useLazyRef<{ value: T; state: StoreState } | null>(() => null);

    const getSnapshot = React.useCallback(() => {
        const state = store.getState();
        const prevValue = lastValueRef.current;

        if (prevValue && prevValue.state === state) {
            return prevValue.value;
        }

        const nextValue = selector(state);
        lastValueRef.current = { value: nextValue, state };
        return nextValue;
    }, [store, selector, lastValueRef]);

    return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

interface FileUploadContextValue {
    inputId: string;
    dropzoneId: string;
    labelId: string;
    disabled: boolean;
    dir: Direction;
    inputRef: React.RefObject<HTMLInputElement | null>;
}

const FileUploadContext = React.createContext<FileUploadContextValue | null>(null);

function useFileUploadContext(consumerName: string) {
    const context = React.useContext(FileUploadContext);
    if (!context) {
        throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
    }
    return context;
}

interface FileUploadProps extends Omit<
    React.ComponentProps<'div'>,
    'defaultValue' | 'onChange'
> {
    value?: File[];
    defaultValue?: File[];
    onValueChange?: (files: File[]) => void;
    onAccept?: (files: File[]) => void;
    onFileAccept?: (file: File) => void;
    onFileReject?: (file: File, message: string) => void;
    onFileValidate?: (file: File) => string | null | undefined;
    onUpload?: (
        files: File[],
        options: {
            onProgress: (file: File, progress: number) => void;
            onSuccess: (file: File) => void;
            onError: (file: File, error: Error) => void;
        },
    ) => Promise<void> | void;
    accept?: string;
    maxFiles?: number;
    maxSize?: number;
    dir?: Direction;
    label?: string;
    name?: string;
    asChild?: boolean;
    disabled?: boolean;
    invalid?: boolean;
    multiple?: boolean;
    required?: boolean;
}

function FileUpload(props: FileUploadProps) {
    const {
        value,
        defaultValue,
        onValueChange,
        onAccept,
        onFileAccept,
        onFileReject,
        onFileValidate,
        onUpload,
        accept,
        maxFiles,
        maxSize,
        dir: dirProp,
        label,
        name,
        asChild,
        disabled = false,
        invalid = false,
        multiple = false,
        required = false,
        children,
        className,
        ...rootProps
    } = props;

    const inputId = React.useId();
    const dropzoneId = React.useId();
    const labelId = React.useId();

    const dir = useDirection(dirProp);
    const listeners = useLazyRef(() => new Set<() => void>()).current;
    const files = useLazyRef<Map<File, FileState>>(() => new Map()).current;
    const inputRef = React.useRef<HTMLInputElement>(null);
    const isControlled = value !== undefined;

    const propsRef = useAsRef({
        onValueChange,
        onAccept,
        onFileAccept,
        onFileReject,
        onFileValidate,
        onUpload,
    });

    const store = React.useMemo<Store>(() => {
        let state: StoreState = {
            files,
            dragOver: false,
            invalid: invalid,
        };

        function reducer(state: StoreState, action: StoreAction): StoreState {
            switch (action.type) {
                case 'ADD_FILES': {
                    for (const file of action.files) {
                        files.set(file, {
                            file,
                            progress: 0,
                            status: 'idle',
                        });
                    }

                    if (propsRef.current.onValueChange) {
                        const fileList = Array.from(files.values()).map(
                            (fileState) => fileState.file,
                        );
                        propsRef.current.onValueChange(fileList);
                    }
                    return { ...state, files };
                }

                case 'SET_FILES': {
                    const newFileSet = new Set(action.files);
                    for (const existingFile of files.keys()) {
                        if (!newFileSet.has(existingFile)) {
                            files.delete(existingFile);
                        }
                    }

                    for (const file of action.files) {
                        const existingState = files.get(file);
                        if (!existingState) {
                            files.set(file, {
                                file,
                                progress: 0,
                                status: 'idle',
                            });
                        }
                    }
                    return { ...state, files };
                }

                case 'SET_PROGRESS': {
                    const fileState = files.get(action.file);
                    if (fileState) {
                        files.set(action.file, {
                            ...fileState,
                            progress: action.progress,
                            status: 'uploading',
                        });
                    }
                    return { ...state, files };
                }

                case 'SET_SUCCESS': {
                    const fileState = files.get(action.file);
                    if (fileState) {
                        files.set(action.file, {
                            ...fileState,
                            progress: 100,
                            status: 'success',
                        });
                    }
                    return { ...state, files };
                }

                case 'SET_ERROR': {
                    const fileState = files.get(action.file);
                    if (fileState) {
                        files.set(action.file, {
                            ...fileState,
                            error: action.error,
                            status: 'error',
                        });
                    }
                    return { ...state, files };
                }

                case 'SET_DRAG_OVER': {
                    return { ...state, dragOver: action.dragOver };
                }

                case 'SET_INVALID': {
                    return { ...state, invalid: action.invalid };
                }

                case 'CLEAR': {
                    files.clear();
                    if (propsRef.current.onValueChange) {
                        propsRef.current.onValueChange([]);
                    }
                    return { ...state, files, invalid: false };
                }

                default:
                    return state;
            }
        }

        return {
            getState: () => state,
            dispatch: (action) => {
                state = reducer(state, action);
                for (const listener of listeners) {
                    listener();
                }
            },
            subscribe: (listener) => {
                listeners.add(listener);
                return () => listeners.delete(listener);
            },
        };
    }, [listeners, files, invalid, propsRef]);

    const acceptTypes = React.useMemo(
        () => accept?.split(',').map((t) => t.trim()) ?? null,
        [accept],
    );

    const onProgress = useLazyRef(() => {
        let frame = 0;
        return (file: File, progress: number) => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                store.dispatch({
                    type: 'SET_PROGRESS',
                    file,
                    progress: Math.min(Math.max(0, progress), 100),
                });
            });
        };
    }).current;

    React.useEffect(() => {
        if (isControlled) {
            store.dispatch({ type: 'SET_FILES', files: value });
        } else if (
            defaultValue &&
            defaultValue.length > 0 &&
            !store.getState().files.size
        ) {
            store.dispatch({ type: 'SET_FILES', files: defaultValue });
        }
    }, [value, defaultValue, isControlled, store]);

    const onFilesUpload = React.useCallback(
        async (files: File[]) => {
            try {
                for (const file of files) {
                    store.dispatch({ type: 'SET_PROGRESS', file, progress: 0 });
                }

                if (propsRef.current.onUpload) {
                    await propsRef.current.onUpload(files, {
                        onProgress,
                        onSuccess: (file) => {
                            store.dispatch({ type: 'SET_SUCCESS', file });
                        },
                        onError: (file, error) => {
                            store.dispatch({
                                type: 'SET_ERROR',
                                file,
                                error: error.message ?? 'Upload failed',
                            });
                        },
                    });
                } else {
                    for (const file of files) {
                        store.dispatch({ type: 'SET_SUCCESS', file });
                    }
                }
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : 'Upload failed';
                for (const file of files) {
                    store.dispatch({
                        type: 'SET_ERROR',
                        file,
                        error: errorMessage,
                    });
                }
            }
        },
        [store, propsRef, onProgress],
    );

    const onFilesChange = React.useCallback(
        (originalFiles: File[]) => {
            if (disabled) return;

            let filesToProcess = [...originalFiles];
            let invalid = false;

            if (maxFiles) {
                const currentCount = store.getState().files.size;
                const remainingSlotCount = Math.max(0, maxFiles - currentCount);

                if (remainingSlotCount < filesToProcess.length) {
                    const rejectedFiles = filesToProcess.slice(remainingSlotCount);
                    invalid = true;

                    filesToProcess = filesToProcess.slice(0, remainingSlotCount);

                    for (const file of rejectedFiles) {
                        let rejectionMessage = `Maximum ${maxFiles} files allowed`;

                        if (propsRef.current.onFileValidate) {
                            const validationMessage =
                                propsRef.current.onFileValidate(file);
                            if (validationMessage) {
                                rejectionMessage = validationMessage;
                            }
                        }

                        propsRef.current.onFileReject?.(file, rejectionMessage);
                    }
                }
            }

            const acceptedFiles: File[] = [];

            for (const file of filesToProcess) {
                let rejected = false;
                let rejectionMessage: string;

                if (propsRef.current.onFileValidate) {
                    const validationMessage = propsRef.current.onFileValidate(file);
                    if (validationMessage) {
                        propsRef.current.onFileReject?.(file, validationMessage);
                        invalid = true;
                        continue;
                    }
                }

                if (acceptTypes) {
                    const fileType = file.type;
                    const fileExtension = `.${file.name.split('.').pop()}`;

                    if (
                        !acceptTypes.some(
                            (type) =>
                                type === fileType ||
                                type === fileExtension ||
                                (type.includes('/*') &&
                                    fileType.startsWith(type.replace('/*', '/'))),
                        )
                    ) {
                        rejectionMessage = 'File type not accepted';
                        propsRef.current.onFileReject?.(file, rejectionMessage);
                        rejected = true;
                        invalid = true;
                    }
                }

                if (maxSize && file.size > maxSize) {
                    rejectionMessage = 'File too large';
                    propsRef.current.onFileReject?.(file, rejectionMessage);
                    rejected = true;
                    invalid = true;
                }

                if (!rejected) {
                    acceptedFiles.push(file);
                }
            }

            if (invalid) {
                store.dispatch({ type: 'SET_INVALID', invalid });
                setTimeout(() => {
                    store.dispatch({ type: 'SET_INVALID', invalid: false });
                }, 2000);
            }

            if (acceptedFiles.length > 0) {
                store.dispatch({ type: 'ADD_FILES', files: acceptedFiles });

                if (isControlled && propsRef.current.onValueChange) {
                    const currentFiles = Array.from(
                        store.getState().files.values(),
                    ).map((f) => f.file);
                    propsRef.current.onValueChange([...currentFiles]);
                }

                if (propsRef.current.onAccept) {
                    propsRef.current.onAccept(acceptedFiles);
                }

                for (const file of acceptedFiles) {
                    propsRef.current.onFileAccept?.(file);
                }

                if (propsRef.current.onUpload) {
                    requestAnimationFrame(() => {
                        onFilesUpload(acceptedFiles);
                    });
                }
            }
        },
        [
            store,
            isControlled,
            propsRef,
            onFilesUpload,
            maxFiles,
            acceptTypes,
            maxSize,
            disabled,
        ],
    );

    const onInputChange = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files ?? []);
            onFilesChange(files);
            event.target.value = '';
        },
        [onFilesChange],
    );

    const contextValue = React.useMemo<FileUploadContextValue>(
        () => ({
            dropzoneId,
            inputId,
            labelId,
            dir,
            disabled,
            inputRef,
        }),
        [dropzoneId, inputId, labelId, dir, disabled],
    );

    const RootPrimitive = asChild ? Slot : 'div';

    return (
        <StoreContext.Provider value={store}>
            <FileUploadContext.Provider value={contextValue}>
                <RootPrimitive
                    data-disabled={disabled ? '' : undefined}
                    data-slot='file-upload'
                    dir={dir}
                    {...rootProps}
                    className={cn('relative flex flex-col gap-2', className)}
                >
                    {children}
                    <input
                        type='file'
                        id={inputId}
                        aria-labelledby={labelId}
                        aria-describedby={dropzoneId}
                        ref={inputRef}
                        tabIndex={-1}
                        accept={accept}
                        name={name}
                        className='sr-only'
                        disabled={disabled}
                        multiple={multiple}
                        required={required}
                        onChange={onInputChange}
                    />
                    <div id={labelId} className='sr-only'>
                        {label ?? 'File upload'}
                    </div>
                </RootPrimitive>
            </FileUploadContext.Provider>
        </StoreContext.Provider>
    );
}

interface FileUploadDropzoneProps extends React.ComponentProps<'div'> {
    asChild?: boolean;
}

function FileUploadDropzone(props: FileUploadDropzoneProps) {
    const {
        asChild,
        className,
        onClick: onClickProp,
        onDragOver: onDragOverProp,
        onDragEnter: onDragEnterProp,
        onDragLeave: onDragLeaveProp,
        onDrop: onDropProp,
        onPaste: onPasteProp,
        onKeyDown: onKeyDownProp,
        ...dropzoneProps
    } = props;

    const context = useFileUploadContext(DROPZONE_NAME);
    const store = useStoreContext(DROPZONE_NAME);
    const dragOver = useStore((state) => state.dragOver);
    const invalid = useStore((state) => state.invalid);

    const propsRef = useAsRef({
        onClick: onClickProp,
        onDragOver: onDragOverProp,
        onDragEnter: onDragEnterProp,
        onDragLeave: onDragLeaveProp,
        onDrop: onDropProp,
        onPaste: onPasteProp,
        onKeyDown: onKeyDownProp,
    });

    const onClick = React.useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            propsRef.current.onClick?.(event);

            if (event.defaultPrevented) return;

            const target = event.target;

            const isFromTrigger =
                target instanceof HTMLElement &&
                target.closest('[data-slot="file-upload-trigger"]');

            if (!isFromTrigger) {
                context.inputRef.current?.click();
            }
        },
        [context.inputRef, propsRef],
    );

    const onDragOver = React.useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            propsRef.current.onDragOver?.(event);

            if (event.defaultPrevented) return;

            event.preventDefault();
            store.dispatch({ type: 'SET_DRAG_OVER', dragOver: true });
        },
        [store, propsRef],
    );

    const onDragEnter = React.useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            propsRef.current.onDragEnter?.(event);

            if (event.defaultPrevented) return;

            event.preventDefault();
            store.dispatch({ type: 'SET_DRAG_OVER', dragOver: true });
        },
        [store, propsRef],
    );

    const onDragLeave = React.useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            propsRef.current.onDragLeave?.(event);

            if (event.defaultPrevented) return;

            const relatedTarget = event.relatedTarget;
            if (
                relatedTarget &&
                relatedTarget instanceof Node &&
                event.currentTarget.contains(relatedTarget)
            ) {
                return;
            }

            event.preventDefault();
            store.dispatch({ type: 'SET_DRAG_OVER', dragOver: false });
        },
        [store, propsRef],
    );

    const onDrop = React.useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            propsRef.current.onDrop?.(event);

            if (event.defaultPrevented) return;

            event.preventDefault();
            store.dispatch({ type: 'SET_DRAG_OVER', dragOver: false });

            const files = Array.from(event.dataTransfer.files);
            const inputElement = context.inputRef.current;
            if (!inputElement) return;

            const dataTransfer = new DataTransfer();
            for (const file of files) {
                dataTransfer.items.add(file);
            }

            inputElement.files = dataTransfer.files;
            inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        },
        [store, context.inputRef, propsRef],
    );

    const onPaste = React.useCallback(
        (event: React.ClipboardEvent<HTMLDivElement>) => {
            propsRef.current.onPaste?.(event);

            if (event.defaultPrevented) return;

            event.preventDefault();
            store.dispatch({ type: 'SET_DRAG_OVER', dragOver: false });

            const items = event.clipboardData?.items;
            if (!items) return;

            const files: File[] = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item?.kind === 'file') {
                    const file = item.getAsFile();
                    if (file) {
                        files.push(file);
                    }
                }
            }

            if (files.length === 0) return;

            const inputElement = context.inputRef.current;
            if (!inputElement) return;

            const dataTransfer = new DataTransfer();
            for (const file of files) {
                dataTransfer.items.add(file);
            }

            inputElement.files = dataTransfer.files;
            inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        },
        [store, context.inputRef, propsRef],
    );

    const onKeyDown = React.useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            propsRef.current.onKeyDown?.(event);

            if (event.target !== event.currentTarget) return;

            if (
                !event.defaultPrevented &&
                (event.key === 'Enter' || event.key === ' ')
            ) {
                event.preventDefault();
                context.inputRef.current?.click();
            }
        },
        [context.inputRef, propsRef],
    );

    const DropzonePrimitive = asChild ? Slot : 'div';

    return (
        <DropzonePrimitive
            role='region'
            id={context.dropzoneId}
            aria-controls={context.inputId}
            aria-disabled={context.disabled}
            aria-invalid={invalid}
            data-disabled={context.disabled ? '' : undefined}
            data-dragging={dragOver ? '' : undefined}
            data-invalid={invalid ? '' : undefined}
            data-slot='file-upload-dropzone'
            dir={context.dir}
            tabIndex={context.disabled ? undefined : 0}
            {...dropzoneProps}
            className={cn(
                'relative flex select-none flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 outline-none transition-colors hover:bg-accent/30 focus-visible:border-ring/50 data-disabled:pointer-events-none data-dragging:border-primary/30 data-invalid:border-destructive data-dragging:bg-accent/30 data-invalid:ring-destructive/20',
                className,
            )}
            onClick={onClick}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
        />
    );
}

interface FileUploadTriggerProps extends React.ComponentProps<'button'> {
    asChild?: boolean;
}

function FileUploadTrigger(props: FileUploadTriggerProps) {
    const { asChild, onClick: onClickProp, ...triggerProps } = props;

    const context = useFileUploadContext(TRIGGER_NAME);

    const propsRef = useAsRef({
        onClick: onClickProp,
    });

    const onClick = React.useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            propsRef.current.onClick?.(event);

            if (event.defaultPrevented) return;

            context.inputRef.current?.click();
        },
        [context.inputRef, propsRef],
    );

    const TriggerPrimitive = asChild ? Slot : 'button';

    return (
        <TriggerPrimitive
            type='button'
            aria-controls={context.inputId}
            data-disabled={context.disabled ? '' : undefined}
            data-slot='file-upload-trigger'
            {...triggerProps}
            disabled={context.disabled}
            onClick={onClick}
        />
    );
}

interface FileUploadClearProps extends React.ComponentProps<'button'> {
    forceMount?: boolean;
    asChild?: boolean;
}

function FileUploadClear(props: FileUploadClearProps) {
    const {
        asChild,
        forceMount,
        disabled,
        onClick: onClickProp,
        ...clearProps
    } = props;

    const context = useFileUploadContext(CLEAR_NAME);
    const store = useStoreContext(CLEAR_NAME);
    const fileCount = useStore((state) => state.files.size);

    const isDisabled = disabled || context.disabled;

    const onClick = React.useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            onClickProp?.(event);

            if (event.defaultPrevented) return;

            store.dispatch({ type: 'CLEAR' });
        },
        [store, onClickProp],
    );

    const shouldRender = forceMount || fileCount > 0;

    if (!shouldRender) return null;

    const ClearPrimitive = asChild ? Slot : 'button';

    return (
        <ClearPrimitive
            type='button'
            data-slot='file-upload-clear'
            data-disabled={isDisabled ? '' : undefined}
            {...clearProps}
            disabled={isDisabled}
            onClick={onClick}
        />
    );
}

export { FileUpload, FileUploadClear, FileUploadDropzone, FileUploadTrigger };
