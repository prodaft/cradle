import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNotif } from '@/contexts';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { OptimizedEntryResponse } from '@/services/cradle';
import ShadcnSelect from '@components/forms/ShadcnSelect';
import { useEffect, useState } from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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
    notesList?: Array<{
        id: string;
        title: string;
        entities: OptimizedEntryResponse[];
    }>;
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
}: EnrichmentRequestModalProps): React.JSX.Element {
    const { intelioApi, entriesApi } = useApi();
    const { execute } = useAPICall();
    const [loading, setLoading] = useState(false);
    const [enricherTypes, setEnricherTypes] = useState<EnricherOption[]>([]);
    const [loadingEnrichers, setLoadingEnrichers] = useState(true);
    const [selectedEntities, setSelectedEntities] = useState<Array<{ value: number, label: string }>>([]);
    const [initialDataLoading, setInitialDataLoading] = useState(false);
    const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(
        () => new Set(notesList?.map((n) => n.id) || []),
    );

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
            setSelectedNoteIds(new Set(notesList.map((n) => n.id)));
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
        setSelectedEntities(
            Object.values(entities).map((entity) => ({
                value: entity.id!,
                label: entity.name,
            })),
        );
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
                    let entities = await Promise.resolve(entitiesList);
                    let allEntities = await execute(() => entriesApi.entitiesList(), {
                        errorMessage: 'Failed to fetch entities',
                    });
                    resolvedEntities = entities.map(
                        (entity) =>
                            allEntities.find(
                                (e) =>
                                    e.name === entity.value &&
                                    e.subtype === entity.type,
                            )?.id!,
                    );
                }

                // Resolve artifacts list if provided
                let resolvedArtifacts: string | undefined;
                if (artifactsList) {
                    resolvedArtifacts = await Promise.resolve(artifactsList);
                }

                // Fetch entity details for the UI if entity IDs are provided
                let entityOptions: Array<{ value: number; label: string }> = [];
                if (resolvedEntities && resolvedEntities.length > 0) {
                    const allEntities = await execute(() => entriesApi.entitiesList(), {
                        errorMessage: 'Failed to fetch entities',
                    });
                    entityOptions = allEntities
                        .filter(
                            (entity) =>
                                entity.id !== undefined &&
                                resolvedEntities!.includes(entity.id),
                        )
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

    const handleEnricherChange = (selectedOptions: EnricherOption[]) => {
        const enricherNames = selectedOptions.map((opt) => opt.value);
        setFormData((prev) => ({
            ...prev,
            enricherNames,
        }));
    };

    const handleEntityChange = (selectedOptions: Array<{ value: number, label: string }>) => {
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
                toast.error('Title is required');
                return;
            }
            if (!formData.enricherNames || formData.enricherNames.length === 0) {
                toast.error('At least one enrichment technique must be selected');
                return;
            }
            if (!formData.entities || formData.entities.length === 0) {
                toast.error('At least one entity must be selected');
                return;
            }
            if (!formData.request.trim() && selectedNoteIds.size === 0) {
                toast.error('Request artifacts are required');
                return;
            }

            // Parse the request text
            const parsedRequest = parseRequestText(formData.request);
            if (parsedRequest.length === 0 && selectedNoteIds.size === 0) {
                toast.error('Request must contain at least one valid entry in format <type>:<artifact>');
                return;
            }

            let result = await execute(
                () =>
                    intelioApi.enrichmentRequestCreate({
                        enrichmentRequestRequest: {
                            title: formData.title,
                            enricherNames: formData.enricherNames,
                            request: parsedRequest,
                            entities: formData.entities,
                            notes: Array.from(selectedNoteIds),
                        },
                    }),
                {
                    successMessage: 'Enrichment request created successfully',
                },
            );
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
        <>
            <DialogHeader>
                <DialogTitle>Create Enrichment Request</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
                {/* Selected Notes List */}
                {notesList && notesList.length > 0 && (
                    <div className='mb-5'>
                        <Label>
                            Selected Notes ({selectedNoteIds.size})
                        </Label>
                        <ul className='border border-cradle-border-accent rounded-lg max-h-48 overflow-y-auto'>
                            {notesList.map((note) => {
                                const isSelected = selectedNoteIds.has(note.id);
                                return (
                                    <li
                                        key={note.id}
                                        className={`flex items-center gap-3 px-4 py-2 border-b border-cradle-border-accent last:border-b-0 transition-colors ${
                                            isSelected
                                                ? 'hover:bg-cradle-bg-secondary/50'
                                                : 'bg-cradle-bg-secondary/10'
                                        }`}
                                    >
                                        <input
                                            type='checkbox'
                                            className='cradle-checkbox'
                                            checked={isSelected}
                                            onChange={() =>
                                                toggleNoteSelection(note.id)
                                            }
                                        />
                                        <span
                                            className={`text-sm truncate flex-1 ${
                                                isSelected
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
                <div className='grid w-full items-center gap-3 mb-5'>
                    <Label htmlFor='title'>
                        Title <span className='text-red-500'>*</span>
                    </Label>
                    <Input
                        id='title'
                        name='title'
                        type='text'
                        placeholder='Enter request title'
                        value={formData.title}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* Enrichment Techniques */}
                <div className='grid w-full items-center gap-3 mb-5'>
                    <Label htmlFor='enricherNames'>
                        Enrichment Techniques <span className='text-red-500'>*</span>
                    </Label>
                    <ShadcnSelect
                        isMulti={true}
                        staticOptions={enricherTypes}
                        placeholder='Select enrichment techniques...'
                        onMultiChange={handleEnricherChange}
                    />
                    <p className='text-xs text-cradle-text-tertiary mt-1'>
                        Select one or more enrichment techniques to apply
                    </p>
                </div>

                {/* Entities */}
                <div className='grid w-full items-center gap-3 mb-5'>
                    <Label htmlFor='entity'>
                        Entities <span className='text-red-500'>*</span>
                    </Label>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div>
                                <ShadcnSelect
                                    isMulti={true}
                                    fetchOptions={fetchEntities}
                                    placeholder='Select entities to enrich...'
                                    values={selectedEntities}
                                    disabled={selectedNoteIds.size > 0}
                                    onMultiChange={handleEntityChange}
                                />
                            </div>
                        </TooltipTrigger>
                        {selectedNoteIds.size > 0 && (
                            <TooltipContent className='bg-blue-500 text-white'>
                                Entities will be selected from the selected notes
                            </TooltipContent>
                        )}
                    </Tooltip>
                </div>

                {/* Request Artifacts */}
                <div className='grid w-full items-center gap-3 mb-5'>
                    <Label htmlFor='request'>
                        Request Artifacts <span className='text-red-500'>*</span>
                    </Label>
                    <textarea
                        id='request'
                        name='request'
                        className='flex min-h-[128px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
                        placeholder='Enter artifacts in format:&#10;type:artifact&#10;type:artifact'
                        value={formData.request}
                        onChange={handleChange}
                        required={selectedNoteIds.size === 0}
                    />
                </div>

                {/* Actions */}
                <div className='flex justify-end gap-2 mt-4'>
                    <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={closeModal}
                        disabled={loading || initialDataLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type='submit'
                        variant='default'
                        size='sm'
                        disabled={loading || initialDataLoading}
                    >
                        {loading ? 'Creating...' : initialDataLoading ? 'Loading...' : 'Create Request'}
                    </Button>
                </div>
            </form>
        </>
    );
}
