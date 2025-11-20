import { useState, useEffect } from 'react';
import useApi from '@/hooks/api/useApi';
import Selector from '@components/forms/Selector';

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
  entity: string;
  request: string;
}

/**
 * Parsed request artifact structure
 */
interface RequestArtifact {
  type: string;
  artifact: string;
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
  onError?: (error: unknown) => void;
}

/**
 * EnrichmentRequestModal component - creates enrichment requests for entities
 *
 * Allows users to select enrichment techniques and specify artifacts to enrich.
 *
 * @example
 * ```tsx
 * <EnrichmentRequestModal
 *   closeModal={closeModal}
 *   onSuccess={() => console.log('Request created')}
 *   onError={(err) => console.error(err)}
 * />
 * ```
 */
export default function EnrichmentRequestModal({
    closeModal,
    onSuccess,
    onError,
}: EnrichmentRequestModalProps): JSX.Element {
    const { intelioApi } = useApi();
    const [loading, setLoading] = useState(false);
    const [enricherTypes, setEnricherTypes] = useState<EnricherOption[]>([]);
    const [loadingEnrichers, setLoadingEnrichers] = useState(true);

    // Form state
    const [formData, setFormData] = useState<EnrichmentFormData>({
        title: '',
        enricherNames: [],
        entity: '',
        request: '',
    });

    // Load available enricher types on mount
    useEffect(() => {
        const fetchEnricherTypes = async () => {
            try {
                const response = await intelioApi.enrichmentSubclassesList();
                const options = response.map(enricher => ({
                    value: enricher.name,
                    label: enricher.displayName || enricher.name,
                }));
                setEnricherTypes(options);
            } catch (error) {
                console.error('Failed to fetch enricher types:', error);
                if (onError) {
                    onError(error);
                }
            } finally {
                setLoadingEnrichers(false);
            }
        };

        fetchEnricherTypes();
    }, [intelioApi, onError]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleEnricherChange = (selectedOptions: EnricherOption[] | null) => {
        const enricherNames = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
        setFormData(prev => ({
            ...prev,
            enricherNames,
        }));
    };

    const parseRequestText = (text: string): RequestArtifact[] => {
        // Parse lines in the format: <type>:<artifact>
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const parsed: RequestArtifact[] = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.includes(':')) {
                const [type, ...artifactParts] = trimmedLine.split(':');
                const artifact = artifactParts.join(':').trim();
                if (type && artifact) {
                    parsed.push({
                        type: type.trim(),
                        artifact: artifact,
                    });
                }
            }
        }

        return parsed;
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
            if (!formData.entity.trim()) {
                throw new Error('Entity ID is required');
            }
            if (!formData.request.trim()) {
                throw new Error('Request artifacts are required');
            }

            // Parse the request text
            const parsedRequest = parseRequestText(formData.request);
            if (parsedRequest.length === 0) {
                throw new Error('Request must contain at least one valid entry in format <type>:<artifact>');
            }

            // Create enrichment request for each selected enricher
            // Note: The API expects enricher_name (singular) and we need to make multiple requests
            // if multiple enrichers are selected
            const promises = formData.enricherNames.map(enricherName =>
                intelioApi.enrichmentRequestCreate({
                    enrichmentRequestRequest: {
                        title: formData.title,
                        enricherName: enricherName,
                        entity: formData.entity,
                        request: parsedRequest,
                    },
                })
            );

            await Promise.all(promises);

            if (onSuccess) {
                onSuccess();
            }
            closeModal();
        } catch (error) {
            console.error('Failed to create enrichment request:', error);
            if (onError) {
                onError(error);
            }
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
                    {loadingEnrichers ? (
                        <div className='text-sm cradle-text-tertiary'>Loading enrichers...</div>
                    ) : (
                        <Selector
                            isMulti={true}
                            staticOptions={enricherTypes}
                            placeholder='Select enrichment techniques...'
                            value={enricherTypes.filter(opt =>
                                formData.enricherNames.includes(opt.value)
                            )}
                            onChange={handleEnricherChange}
                        />
                    )}
                    <p className='text-xs cradle-text-tertiary mt-1'>
                        Select one or more enrichment techniques to apply
                    </p>
                </div>

                {/* Entity ID */}
                <div className='mb-4'>
                    <label
                        htmlFor='entity'
                        className='block text-sm font-medium cradle-text-secondary mb-1'
                    >
                        Entity ID <span className='text-red-500'>*</span>
                    </label>
                    <input
                        id='entity'
                        name='entity'
                        type='text'
                        className='input input-block input-bordered w-full'
                        placeholder='Enter entity UUID'
                        value={formData.entity}
                        onChange={handleChange}
                        required
                    />
                    <p className='text-xs cradle-text-tertiary mt-1'>
                        UUID of the entity to enrich
                    </p>
                </div>

                {/* Request Artifacts */}
                <div className='mb-4'>
                    <label
                        htmlFor='request'
                        className='block text-sm font-medium cradle-text-secondary mb-1'
                    >
                        Request Artifacts <span className='text-red-500'>*</span>
                    </label>
                    <textarea
                        id='request'
                        name='request'
                        className='textarea textarea-bordered w-full h-32'
                        placeholder='Enter artifacts in format:&#10;type:artifact&#10;type:artifact'
                        value={formData.request}
                        onChange={handleChange}
                        required
                    />
                    <p className='text-xs cradle-text-tertiary mt-1'>
                        Enter one artifact per line in format: &lt;type&gt;:&lt;artifact&gt;
                        <br />
                        Example: ipv4:192.168.1.1
                    </p>
                </div>

                {/* Actions */}
                <div className='flex justify-end gap-2 mt-6'>
                    <button
                        type='button'
                        className='btn'
                        onClick={closeModal}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type='submit'
                        className='btn btn-primary'
                        disabled={loading}
                    >
                        {loading ? 'Creating...' : 'Create Request'}
                    </button>
                </div>
            </form>
        </div>
    );
}
