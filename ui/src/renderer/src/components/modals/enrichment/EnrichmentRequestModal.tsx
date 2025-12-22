import Tooltip from '@/components/base/Tooltip/Tooltip';
import { useNotif } from '@/contexts';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { OptimizedEntryResponse } from '@/services/cradle';
import Selector from '@components/forms/Selector';
import { useEffect, useState } from 'react';
import { MultiValue } from 'react-select';

/**
 * Enricher type option for selector
 */
interface EnricherOption {
    value: string;
    label: string;
}

/**
 * Form data structure for enrichment request
 */
interface EnrichmentFormData {
    title: string;
    enricherNames: string[];
    entities: number[];
    request: string;
    notes?: string[];
}

/**
 * Parsed request artifact structure
 */
interface RequestArtifact {
    entry_class: string;
    name: string;
}

/**
 * EnrichmentRequestModal component props
 */
export interface EnrichmentRequestModalProps {
    /** Function to close the modal */
    closeModal: () => void;
    /** Optional callback to execute on successful request creation */
    onSuccess?: () => void;
    /** Optional callback to execute on error */
    onError?: (error: Error) => void;
    /** Optional list of entity IDs or promise resolving to list of entity IDs */
    entitiesList?: number[] | Promise<Array<{ type: string; value: string }>>;
    /** Optional artifacts text or promise resolving to artifacts text */
    artifactsList?: string | Promise<string>;
    /** Optional list of notes to include in the enrichment request */
    notesList?: Array<{ id: string; title: string; entities: OptimizedEntryResponse[] }>;
}

/**
 * EnrichmentRequestModal component - creates enrichment requests for entities
 *
 * Allows users to select enrichment techniques and specify artifacts to enrich.
 * Optionally accepts pre-populated entities and artifacts lists as props.
 *
 * @example
 * ```tsx
 * <EnrichmentRequestModal
 *   closeModal={closeModal}
 *   onSuccess={() => console.log('Request created')}
 *   onError={(err) => console.error(err)}
 *   entitiesList={[1, 2, 3]}
 *   artifactsList="type:artifact\ntype:artifact"
 * />
 * ```
 *
 * @example With promises
 * ```tsx
 * <EnrichmentRequestModal
 *   closeModal={closeModal}
 *   entitiesList={fetchEntityIds()}
 *   artifactsList={getArtifactsText()}
 * />
 * ```
 */
export default function EnrichmentRequestModal({
    closeModal,
    onSuccess,
    onError,
    entitiesList,
    artifactsList,
    notesList,
}: EnrichmentRequestModalProps): JSX.Element {
    const { intelioApi, entriesApi } = useApi();
    const { execute } = useAPICall();
    const [loading, setLoading] = useState(false);
    const [enricherTypes, setEnricherTypes] = useState<EnricherOption[]>([]);
    const [loadingEnrichers, setLoadingEnrichers] = useState(true);
    const { notify } = useNotif();
    const [selectedEntities, setSelectedEntities] = useState<Array<{ value: number, label: string }>>([]);
    const [initialDataLoading, setInitialDataLoading] = useState(false);
    const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(() => new Set(notesList?.map(n => n.id) || []));

    // Form state
    const [formData, setFormData] = useState<EnrichmentFormData>({
        title: '',
        enricherNames: [],
        entities: [],
        request: '',
    });

    // Load available enricher types on mount
    useEffect(() => {
        const fetchEnricherTypes = async () => {
            const enricherTypes = (
                await execute(() => intelioApi.enrichmentSubclassesList(), {
                    errorMessage: 'Failed to fetch enricher types',
                })
            ).filter((enricher) => enricher.enabled);

            const options = enricherTypes.map((enricher) => ({
                value: enricher.className,
                label: enricher.name,
            }));
            setEnricherTypes(options);
        };

        fetchEnricherTypes();
    }, [intelioApi, onError]);

    // Update selected note IDs if notesList changes
    useEffect(() => {
        if (notesList) {
            setSelectedNoteIds(new Set(notesList.map(n => n.id)));
        }
    }, [notesList]);

    const toggleNoteSelection = (id: string) => {
        const newSelected = new Set(selectedNoteIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedNoteIds(newSelected);
    };

    useEffect(() => {
        let entities: { [key: number]: OptimizedEntryResponse } = {};
        for (const note of notesList || []) {
            for (const entity of note.entities) {
                if (selectedNoteIds.has(note.id)) {
                    entities[entity.id!] = entity;
                }
            }
        }
        setSelectedEntities(Object.values(entities).map((entity) => ({
            value: entity.id!,
            label: entity.name,
        })));
        setFormData((prev) => ({
            ...prev,
            entities: Object.values(entities).map((entity) => entity.id!),
        }));
    }, [selectedNoteIds]);

    // Load initial data from props (entities and artifacts lists)
    useEffect(() => {
        const loadInitialData = async () => {
            if (!entitiesList && !artifactsList) {
                return;
            }

            setInitialDataLoading(true);
            try {
                // Resolve entities list if provided
                let resolvedEntities: number[] | undefined;
                if (entitiesList) {
                    let entities = (await Promise.resolve(entitiesList));
                    let allEntities = await execute(() => entriesApi.entitiesList(), {
                        errorMessage: 'Failed to fetch entities',
                    });
                    resolvedEntities = entities.map((entity) => allEntities.find((e) => e.name === entity.value && e.subtype === entity.type)?.id!);
                    console.log(allEntities, entities, resolvedEntities);
                }

                // Resolve artifacts list if provided
                let resolvedArtifacts: string | undefined;
                if (artifactsList) {
                    resolvedArtifacts = await Promise.resolve(artifactsList);
                }

                // Fetch entity details for the UI if entity IDs are provided
                let entityOptions: Array<{ value: number, label: string }> = [];
                if (resolvedEntities && resolvedEntities.length > 0) {
                    const allEntities = await execute(
                        () => entriesApi.entitiesList(),
                        {
                            errorMessage: 'Failed to fetch entities',
                        }
                    );
                    entityOptions = allEntities
                        .filter((entity) => entity.id !== undefined && resolvedEntities!.includes(entity.id))
                        .map((entity) => ({
                            value: entity.id!,
                            label: entity.name,
                        }));
                }

                // Update form data with resolved values
                setFormData((prev) => ({
                    ...prev,
                    entities: resolvedEntities || prev.entities,
                    request: resolvedArtifacts || prev.request,
                }));

                // Update selected entities state for the UI
                if (entityOptions.length > 0) {
                    setSelectedEntities(entityOptions);
                }
            } catch (error) {
                console.error('Failed to load initial data:', error);
                if (onError) {
                    onError(error as Error);
                }
            } finally {
                setInitialDataLoading(false);
            }
        };

        loadInitialData();
    }, [entitiesList, artifactsList, entriesApi, execute, onError]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleEnricherChange = (selectedOptions: MultiValue<EnricherOption>) => {
        const enricherNames = Array.from(selectedOptions).map((opt) => opt.value);
        setFormData((prev) => ({
            ...prev,
            enricherNames,
        }));
    };

    const handleEntityChange = (selectedOptions) => {
        const entities = selectedOptions ? selectedOptions.map((opt) => opt.value) : [];
        setSelectedEntities(selectedOptions || []);
        setFormData((prev) => ({
            ...prev,
            entities,
        }));
    };

    const parseRequestText = (text: string): RequestArtifact[] => {
        // Parse lines in the format: <type>:<artifact>
        const lines = text.split('\n').filter((line) => line.trim() !== '');
        const parsed: RequestArtifact[] = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.includes(':')) {
                const [type, ...artifactParts] = trimmedLine.split(':');
                const artifact = artifactParts.join(':').trim();
                if (type && artifact) {
                    parsed.push({
                        entry_class: type.trim(),
                        name: artifact,
                    });
                }
            }
        }

        return parsed;
    };

    const fetchEntities = async (searchTerm) => {
        const entities = (
            await execute(() => entriesApi.entitiesList(), {
                errorMessage: 'Failed to fetch entities',
            })
        ).filter((entity) =>
            searchTerm
                ? entity.name.toLowerCase().includes(searchTerm.toLowerCase())
                : true,
        );

        const options = entities.map((entity) => ({
            value: entity.id,
            label: entity.name,
        }));

        return options;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate form data
            if (!formData.title.trim()) {
                notify({ type: 'error', text: 'Title is required' });
                return;
            }
            if (!formData.enricherNames || formData.enricherNames.length === 0) {
                notify({ type: 'error', text: 'At least one enrichment technique must be selected' });
                return;
            }
            if (!formData.entities || formData.entities.length === 0) {
                notify({ type: 'error', text: 'At least one entity must be selected' });
                return;
            }
            if (!formData.request.trim() && selectedNoteIds.size === 0) {
                notify({ type: 'error', text: 'Request artifacts are required' });
                return;
            }

            // Parse the request text
            const parsedRequest = parseRequestText(formData.request);
            if (parsedRequest.length === 0 && selectedNoteIds.size === 0) {
                notify({ type: 'error', text: 'Request must contain at least one valid entry in format <type>:<artifact>' });
                return;
            }

            let result = await execute(() =>
                intelioApi.enrichmentRequestCreate({
                    enrichmentRequestRequest: {
                        title: formData.title,
                        enricherNames: formData.enricherNames,
                        request: parsedRequest,
                        entities: formData.entities,
                        notes: Array.from(selectedNoteIds),
                    },
                }),
            );
            console.log(result);
            if (onSuccess) {
                onSuccess();
            }
            closeModal();
        } catch (error) {
            console.error('Failed to create enrichment request:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='min-w-[500px] max-w-2xl'>
            <div className='flex items-end justify-between mb-4'>
                <div className='flex items-center gap-3'>
                    <h2 className='text-xl font-semibold text-cradle-text-primary tracking-wide'>
                        Create Enrichment Request
                    </h2>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Selected Notes List */}
                {notesList && notesList.length > 0 && (
                    <div className='mb-5'>
                        <label className='cradle-label mb-2 block'>
                            Selected Notes ({selectedNoteIds.size})
                        </label>
                        <ul className='border border-cradle-border-accent rounded-lg max-h-48 overflow-y-auto'>
                            {notesList.map((note) => {
                                const isSelected = selectedNoteIds.has(note.id);
                                return (
                                    <li
                                        key={note.id}
                                        className={`flex items-center gap-3 px-4 py-2 border-b border-cradle-border-accent last:border-b-0 transition-colors ${isSelected
                                            ? 'hover:bg-cradle-bg-secondary/50'
                                            : 'bg-cradle-bg-secondary/10'
                                            }`}
                                    >
                                        <input
                                            type='checkbox'
                                            className='cradle-checkbox'
                                            checked={isSelected}
                                            onChange={() => toggleNoteSelection(note.id)}
                                        />
                                        <span
                                            className={`text-sm truncate flex-1 ${isSelected
                                                ? 'text-cradle-text-primary'
                                                : 'text-cradle-text-tertiary line-through decoration-cradle-text-tertiary'
                                                }`}
                                        >
                                            {note.title || 'Untitled'}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                {/* Title */}
                <div className='mb-5'>
                    <label
                        htmlFor='title'
                        className='cradle-label mb-2 block'
                    >
                        Title <span className='text-red-500'>*</span>
                    </label>
                    <input
                        id='title'
                        name='title'
                        type='text'
                        className='cradle-input w-full'
                        placeholder='Enter request title'
                        value={formData.title}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* Enrichment Techniques */}
                <div className='mb-5'>
                    <label
                        htmlFor='enricherNames'
                        className='cradle-label mb-2 block'
                    >
                        Enrichment Techniques <span className='text-red-500'>*</span>
                    </label>
                    <Selector
                        isMulti={true}
                        staticOptions={enricherTypes}
                        placeholder='Select enrichment techniques...'
                        usePortal={false}
                        menuPosition='absolute'
                        onChange={handleEnricherChange}
                    />
                    <p className='text-xs text-cradle-text-tertiary mt-1'>
                        Select one or more enrichment techniques to apply
                    </p>
                </div>

                {/* Entities */}
                <div className='mb-5'>
                    <label
                        htmlFor='entity'
                        className='cradle-label mb-2 block'
                    >
                        Entities <span className='text-red-500'>*</span>
                    </label>
                    <Tooltip
                        content={selectedNoteIds.size > 0 ? "Entities will be selected from the selected notes" : undefined}
                        color='info'
                        showArrow={false}
                        usePortal={false}
                    >
                        <Selector
                            isMulti={true}
                            fetchOptions={fetchEntities}
                            placeholder='Select entities to enrich...'
                            usePortal={false}
                            menuPosition='absolute'
                            onChange={handleEntityChange}
                            value={selectedEntities}
                            isLoading={initialDataLoading}
                            isDisabled={selectedNoteIds.size > 0}
                        />
                    </Tooltip>
                </div>

                {/* Request Artifacts */}
                <div className='mb-5 w-full'>
                    <label
                        htmlFor='request'
                        className='cradle-label mb-2 block'
                    >
                        Request Artifacts <span className='text-red-500'>*</span>
                    </label>
                    <textarea
                        id='request'
                        name='request'
                        className='cradle-input w-full h-32 py-2'
                        placeholder='Enter artifacts in format:&#10;type:artifact&#10;type:artifact'
                        value={formData.request}
                        onChange={handleChange}
                        required={selectedNoteIds.size === 0}
                    />
                </div>

                {/* Actions */}
                <div className='flex justify-end gap-2 mt-4 pt-3 cradle-border-t'>
                    <button
                        type='button'
                        className='rounded-full border border-cradle-border-accent hover:border-cradle-accent-primary bg-transparent transition-colors text-cradle-text-secondary hover:text-cradle-text-primary text-sm px-3 py-1.5 flex items-center gap-1.5'
                        onClick={closeModal}
                        disabled={loading || initialDataLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type='submit'
                        className='rounded-full border border-cradle-accent-primary bg-cradle-accent-primary/10 text-cradle-accent-primary hover:bg-cradle-accent-primary/20 transition-colors text-sm px-4 py-1.5 flex items-center gap-1.5'
                        disabled={loading || initialDataLoading}
                    >
                        {loading ? 'Creating...' : initialDataLoading ? 'Loading...' : 'Create Request'}
                    </button>
                </div>
            </form>
        </div>
    );
}
