import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
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
    entitiesList?: number[] | Promise<number[]>;
    /** Optional artifacts text or promise resolving to artifacts text */
    artifactsList?: string | Promise<string>;
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
}: EnrichmentRequestModalProps): JSX.Element {
    const { intelioApi, entriesApi } = useApi();
    const { execute } = useAPICall();
    const [loading, setLoading] = useState(false);
    const [enricherTypes, setEnricherTypes] = useState<EnricherOption[]>([]);
    const [loadingEnrichers, setLoadingEnrichers] = useState(true);
    const [selectedEntities, setSelectedEntities] = useState<Array<{ value: number, label: string }>>([]);
    const [initialDataLoading, setInitialDataLoading] = useState(false);

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
                    resolvedEntities = await Promise.resolve(entitiesList);
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
                throw new Error('Title is required');
            }
            if (!formData.enricherNames || formData.enricherNames.length === 0) {
                throw new Error('At least one enrichment technique must be selected');
            }
            if (!formData.entities || formData.entities.length === 0) {
                throw new Error('At least one entity must be selected');
            }
            if (!formData.request.trim()) {
                throw new Error('Request artifacts are required');
            }

            // Parse the request text
            const parsedRequest = parseRequestText(formData.request);
            if (parsedRequest.length === 0) {
                throw new Error(
                    'Request must contain at least one valid entry in format <type>:<artifact>',
                );
            }

            console.log({
                title: formData.title,
                enricherNames: formData.enricherNames,
                entities: formData.entities,
                request: parsedRequest,
            });

            let result = await execute(() =>
                intelioApi.enrichmentRequestCreate({
                    enrichmentRequestRequest: {
                        title: formData.title,
                        enricherNames: formData.enricherNames,
                        request: parsedRequest,
                        entities: formData.entities,
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
        <div className='w-full max-w-2xl p-6'>
            <h2 className='text-2xl font-bold mb-4 cradle-text-primary'>
                Create Enrichment Request
            </h2>
            <form onSubmit={handleSubmit}>
                {/* Title */}
                <div className='mb-4'>
                    <label
                        htmlFor='title'
                        className='block text-sm font-medium cradle-text-secondary mb-1'
                    >
                        Title <span className='text-red-500'>*</span>
                    </label>
                    <input
                        id='title'
                        name='title'
                        type='text'
                        className='input input-block input-bordered w-full'
                        placeholder='Enter request title'
                        value={formData.title}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* Enrichment Techniques */}
                <div className='mb-4'>
                    <label
                        htmlFor='enricherNames'
                        className='block text-sm font-medium cradle-text-secondary mb-1'
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
                    <p className='text-xs cradle-text-tertiary mt-1'>
                        Select one or more enrichment techniques to apply
                    </p>
                </div>

                {/* Entities */}
                <div className='mb-4'>
                    <label
                        htmlFor='entity'
                        className='block text-sm font-medium cradle-text-secondary mb-1'
                    >
                        Entities <span className='text-red-500'>*</span>
                    </label>
                    <Selector
                        isMulti={true}
                        fetchOptions={fetchEntities}
                        placeholder='Select entities to enrich...'
                        usePortal={false}
                        menuPosition='absolute'
                        onChange={handleEntityChange}
                        value={selectedEntities}
                        isLoading={initialDataLoading}
                    />
                </div>

                {/* Request Artifacts */}
                <div className='mb-4 w-full'>
                    <label
                        htmlFor='request'
                        className='block text-sm font-medium cradle-text-secondary mb-1'
                    >
                        Request Artifacts <span className='text-red-500'>*</span>
                    </label>
                    <textarea
                        id='request'
                        name='request'
                        className='textarea textarea-block w-full h-32'
                        placeholder='Enter artifacts in format:&#10;type:artifact&#10;type:artifact'
                        value={formData.request}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* Actions */}
                <div className='flex justify-end gap-2 mt-6'>
                    <button
                        type='button'
                        className='btn'
                        onClick={closeModal}
                        disabled={loading || initialDataLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type='submit'
                        className='btn btn-primary'
                        disabled={loading || initialDataLoading}
                    >
                        {loading ? 'Creating...' : initialDataLoading ? 'Loading...' : 'Create Request'}
                    </button>
                </div>
            </form>
        </div>
    );
}
