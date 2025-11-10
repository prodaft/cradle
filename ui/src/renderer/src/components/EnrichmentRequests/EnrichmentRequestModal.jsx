import { useEffect, useState } from 'react';
import useApi from '../../hooks/useApi/useApi';
import { useAPICall } from '../../hooks/useAPICall';
import Selector from '../Selector/Selector';

const EnrichmentRequestModal = ({ closeModal, onSuccess }) => {
    const { intelioApi, entriesApi } = useApi();
    const { execute } = useAPICall();
    const [loading, setLoading] = useState(false);
    const [enricherTypes, setEnricherTypes] = useState([]);
    const [selectedEntities, setSelectedEntities] = useState([]);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        enricherNames: [],
        entities: [],
        request: '',
    });

    // Load available enricher types on mount
    useEffect(() => {
        const fetchEnricherTypes = async () => {
            const enricherTypes = (await execute(() => intelioApi.enrichmentSubclassesList(), {
                errorMessage: 'Failed to fetch enricher types',
            })).filter(enricher => enricher.enabled);

            const options = enricherTypes.map(enricher => ({
                value: enricher.className,
                label: enricher.name,
            }));
            setEnricherTypes(options);
        };

        fetchEnricherTypes();
    }, [intelioApi]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleEnricherChange = (selectedOptions) => {
        const enricherNames = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
        setFormData(prev => ({
            ...prev,
            enricherNames,
        }));
    };

    const handleEntityChange = (selectedOptions) => {
        const entities = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
        setSelectedEntities(entities);
        setFormData(prev => ({
            ...prev,
            entities,
        }));
    };

    const parseRequestText = (text) => {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const parsed = [];

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
        const entities = (await execute(() => entriesApi.entitiesList(), {
            errorMessage: 'Failed to fetch entities',
        })).filter(entity => searchTerm ? entity.name.toLowerCase().includes(searchTerm.toLowerCase()) : true);

        const options = entities.map(entity => ({
            value: entity.id,
            label: entity.name,
        }));

        return options;
    };

    const handleSubmit = async (e) => {
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
                throw new Error('Request must contain at least one valid entry in format <type>:<artifact>');
            }

            console.log({
                title: formData.title,
                enricherNames: formData.enricherNames,
                entities: formData.entities,
                request: parsedRequest,
            });

            let result = await execute(() => intelioApi.enrichmentRequestCreate({
                enrichmentRequestRequest: {
                    title: formData.title,
                    enricherNames: formData.enricherNames,
                    entities: formData.entities,
                    request: parsedRequest,
                },
            }));
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
                        menuPosition='auto'
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
                        menuPosition='auto'
                        onChange={handleEntityChange}
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
};

export default EnrichmentRequestModal;
