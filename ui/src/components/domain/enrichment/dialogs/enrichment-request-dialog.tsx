import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import MultipleSelector, { type Option } from '@/components/ui/multi-select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { queryKeys, useNdjsonQuery } from '@/hooks/query';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';

type OptimizedEntryResponse = components['schemas']['OptimizedEntryResponse'];

import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * Form data structure for enrichment request
 */
interface EnrichmentFormData {
    title: string;
    enricherNames: string[];
    entities: number[];
    /** One line per request: `subtype:value` (only the first line is used). */
    artifactInput: string;
}

/**
 * Parsed request artifact structure
 */
interface RequestArtifact {
    entry_class: string;
    name: string;
}

/**
 * EnrichmentRequestDialog component props
 */
interface EnrichmentRequestDialogProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Callback when dialog open state changes */
    onOpenChange: (open: boolean) => void;
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
 * EnrichmentRequestDialog component - creates enrichment requests for entities
 *
 * Allows users to select enrichment techniques and specify artifacts to enrich.
 * Optionally accepts pre-populated entities and artifacts lists as props.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <EnrichmentRequestDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   onSuccess={() => console.log('Request created')}
 *   onError={(err) => console.error(err)}
 *   entitiesList={[1, 2, 3]}
 *   artifactsList="ip:203.0.113.1"
 * />
 * ```
 *
 * @example With promises
 * ```tsx
 * const [open, setOpen] = useState(false);
 * <EnrichmentRequestDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   entitiesList={fetchEntityIds()}
 *   artifactsList={getArtifactsText()}
 * />
 * ```
 */
export default function EnrichmentRequestDialog({
    open,
    onOpenChange,
    onSuccess,
    onError,
    entitiesList,
    artifactsList,
    notesList,
}: EnrichmentRequestDialogProps): React.JSX.Element {
    const [selectedEntities, setSelectedEntities] = useState<
        Array<{ value: number; label: string }>
    >([]);
    const [initialDataLoading, setInitialDataLoading] = useState(false);
    const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(
        () => new Set(notesList?.map((n) => n.id) || []),
    );

    // Form state
    const [formData, setFormData] = useState<EnrichmentFormData>({
        title: '',
        enricherNames: [],
        entities: [],
        artifactInput: '',
    });

    const { data: enricherTypesData, isLoading } = useQuery({
        queryKey: ['enrichment', 'subclasses'],
        queryFn: async () => {
            const { data, error, response } =
                await fetchClient.GET('/intelio/enrichment/');
            if (error) throw { response, error };
            return data;
        },
        enabled: open,
        meta: {
            showErrorToast: true,
        },
    });

    const enricherTypes: Option[] = ((enricherTypesData ?? []) as any[])
        .filter((enricher) => enricher.enabled)
        .map((enricher) => ({
            value: enricher.class_name,
            label: enricher.name,
        }));

    // Update selected note IDs if notesList changes
    useEffect(() => {
        if (notesList) {
            setSelectedNoteIds(new Set(notesList.map((n) => n.id)));
        }
    }, [notesList]);

    const toggleNoteSelection = (id: string) => {
        setSelectedNoteIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    useEffect(() => {
        const byId = new Map<number, OptimizedEntryResponse>();
        for (const note of notesList || []) {
            if (!selectedNoteIds.has(note.id)) continue;
            for (const entity of note.entities) {
                if (typeof entity.id === 'number') {
                    byId.set(entity.id, entity);
                }
            }
        }

        const entityArr = Array.from(byId.values());
        setSelectedEntities(
            entityArr.map((entity) => ({
                value: entity.id as number,
                label: entity.name,
            })),
        );
        setFormData((prev) => ({
            ...prev,
            entities: entityArr.map((entity) => entity.id as number),
        }));
    }, [selectedNoteIds, notesList]);

    // Load entities list (NDJSON stream, single request)
    const { data: allEntitiesData } = useNdjsonQuery({
        path: '/entries/entities/stream/',
        queryKey: queryKeys.entities.list(),
        enabled: open,
        meta: {
            showErrorToast: true,
        },
    });

    // Load initial data from props (entities and artifacts lists)
    useEffect(() => {
        const loadInitialData = async () => {
            if (!entitiesList && !artifactsList) {
                return;
            }

            setInitialDataLoading(true);
            try {
                const isNumberArray = (x: unknown): x is number[] =>
                    Array.isArray(x) && x.every((v) => typeof v === 'number');
                const isTypedEntityArray = (
                    x: unknown,
                ): x is Array<{ type: string; value: string }> =>
                    Array.isArray(x) &&
                    x.every(
                        (v) =>
                            typeof (v as Record<string, unknown>)?.type === 'string' &&
                            typeof (v as Record<string, unknown>)?.value === 'string',
                    );

                // Resolve entities list if provided
                let resolvedEntities: number[] | undefined;
                if (entitiesList && allEntitiesData) {
                    const entities = await Promise.resolve(entitiesList);
                    if (isNumberArray(entities)) {
                        resolvedEntities = entities;
                    } else if (isTypedEntityArray(entities)) {
                        resolvedEntities = entities
                            .map((entity) => {
                                const match = allEntitiesData.find(
                                    (e) =>
                                        e.name === entity.value &&
                                        e.subtype === entity.type,
                                );
                                return match?.id;
                            })
                            .filter((id): id is number => typeof id === 'number');
                    }
                }

                // Resolve artifacts list if provided
                let resolvedArtifacts: string | undefined;
                if (artifactsList) {
                    resolvedArtifacts = await Promise.resolve(artifactsList);
                }

                // Fetch entity details for the UI if entity IDs are provided
                let entityOptions: Array<{ value: number; label: string }> = [];
                if (
                    resolvedEntities &&
                    resolvedEntities.length > 0 &&
                    allEntitiesData
                ) {
                    entityOptions = allEntitiesData
                        .filter(
                            (entity) =>
                                typeof entity.id === 'number' &&
                                resolvedEntities!.includes(entity.id),
                        )
                        .map((entity) => ({
                            value: entity.id as number,
                            label: entity.name,
                        }));
                }

                // Update form data with resolved values
                setFormData((prev) => ({
                    ...prev,
                    entities: resolvedEntities || prev.entities,
                    artifactInput: resolvedArtifacts || prev.artifactInput,
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

        if (allEntitiesData || artifactsList) {
            loadInitialData();
        }
    }, [entitiesList, artifactsList, allEntitiesData, onError]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleEnricherChange = (options?: Option[]) => {
        const enricherNames = (options ?? []).map((opt) => String(opt.value));
        setFormData((prev) => ({
            ...prev,
            enricherNames,
        }));
    };

    const handleEntityChange = (options?: Option[]) => {
        const selected = (options ?? []).map((o) => ({
            value: Number(o.value),
            label: o.label,
        }));
        const entities = selected.map((opt) => opt.value);
        setSelectedEntities(selected);
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

    const createMutation = useMutation({
        mutationFn: async (payload: {
            title: string;
            enricherNames: string[];
            artifact?: RequestArtifact;
            entities: number[];
            notes: string[];
        }) => {
            const { data, error, response } = await fetchClient.POST(
                '/intelio/enrich/',
                {
                    body: {
                        title: payload.title,
                        enricher_names: payload.enricherNames,
                        ...(payload.artifact ? { artifact: payload.artifact } : {}),
                        entities: payload.entities,
                        notes: payload.notes,
                    } as any,
                },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.enrichment.requests.lists() }],
            successMessage: 'Enrichment request created successfully',
        },
    });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Validate form data
        if (!formData.title.trim()) {
            toast.error('Title is required');
            return;
        }
        if (!formData.enricherNames || formData.enricherNames.length === 0) {
            toast.error('At least one enrichment technique must be selected');
            return;
        }
        if (!formData.artifactInput.trim() && selectedNoteIds.size === 0) {
            toast.error('Specify one artifact or select at least one note');
            return;
        }

        const parsedRequest = parseRequestText(formData.artifactInput);
        if (parsedRequest.length > 1) {
            toast.error(
                'Only one artifact per enrichment request. Use a single line: type:value',
            );
            return;
        }
        if (parsedRequest.length === 0 && selectedNoteIds.size === 0) {
            toast.error(
                'Enter one line as type:value, or select notes that yield a single artifact',
            );
            return;
        }

        const artifact = parsedRequest.length === 1 ? parsedRequest[0]! : undefined;

        createMutation.mutate(
            {
                title: formData.title,
                enricherNames: formData.enricherNames,
                artifact,
                entities: formData.entities,
                notes: Array.from(selectedNoteIds),
            },
            {
                onSuccess: () => {
                    onSuccess?.();
                    onOpenChange(false);
                },
                onError: (error: Error) => {
                    onError?.(error);
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Enrichment Request</DialogTitle>
                        <DialogDescription>
                            Create a new enrichment request to process entities with
                            selected enrichment techniques.
                        </DialogDescription>
                    </DialogHeader>
                    {/* Selected Notes List */}
                    {notesList && notesList.length > 0 && (
                        <FieldSet>
                            <FieldLegend>
                                Selected Notes ({selectedNoteIds.size})
                            </FieldLegend>
                            <ScrollArea className='border border-border rounded-lg max-h-48'>
                                <ul>
                                    {notesList.map((note) => {
                                        const isSelected = selectedNoteIds.has(note.id);
                                        return (
                                            <li
                                                key={note.id}
                                                className={`flex items-center gap-3 px-4 py-2 border-b border-border last:border-b-0 transition-colors ${
                                                    isSelected
                                                        ? 'hover:bg-secondary/50'
                                                        : 'bg-secondary/10'
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
                                                            ? 'text-foreground'
                                                            : 'text-muted-foreground line-through decoration-muted-foreground'
                                                    }`}
                                                >
                                                    {note.title || 'Untitled'}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </ScrollArea>
                        </FieldSet>
                    )}

                    <FieldGroup className='gap-4'>
                        {/* Title */}
                        <Field>
                            <FieldLabel htmlFor='title'>
                                Title <span className='text-destructive'>*</span>
                            </FieldLabel>
                            <Input
                                id='title'
                                name='title'
                                type='text'
                                placeholder='Enter request title'
                                value={formData.title}
                                onChange={handleChange}
                                required
                            />
                        </Field>

                        {/* Enrichment Techniques */}
                        <Field>
                            <FieldLabel htmlFor='enricherNames'>
                                Enrichment Techniques{' '}
                                <span className='text-destructive'>*</span>
                            </FieldLabel>
                            <div id='enricherNames'>
                                <MultipleSelector
                                    value={enricherTypes.filter((e) =>
                                        formData.enricherNames.includes(e.value),
                                    )}
                                    defaultOptions={enricherTypes}
                                    placeholder='Select enrichment techniques...'
                                    disabled={isLoading}
                                    onChange={handleEnricherChange}
                                    emptyIndicator={
                                        isLoading ? (
                                            <p className='text-center text-sm'>
                                                Loading enrichment techniques...
                                            </p>
                                        ) : (
                                            <p className='text-center text-sm'>
                                                No enrichment techniques found
                                            </p>
                                        )
                                    }
                                />
                            </div>
                            <FieldDescription>
                                Select one or more enrichment techniques to apply
                            </FieldDescription>
                        </Field>

                        {/* Entities — access scope for who can see this request */}
                        <Field>
                            <FieldLabel htmlFor='entity'>Entities</FieldLabel>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div id='entity' className='w-full'>
                                        <MultipleSelector
                                            value={
                                                selectedEntities.map((e) => ({
                                                    value: String(e.value),
                                                    label: e.label,
                                                })) as Option[]
                                            }
                                            defaultOptions={
                                                ((allEntitiesData ?? [])
                                                    .filter(
                                                        (e) => typeof e.id === 'number',
                                                    )
                                                    .map((e) => ({
                                                        value: String(e.id),
                                                        label: e.name,
                                                    })) as Option[]) || []
                                            }
                                            placeholder='Select entities for access scope…'
                                            disabled={selectedNoteIds.size > 0}
                                            onChange={handleEntityChange}
                                            emptyIndicator={
                                                <p className='text-center text-sm'>
                                                    No entities found
                                                </p>
                                            }
                                        />
                                    </div>
                                </TooltipTrigger>
                                {selectedNoteIds.size > 0 && (
                                    <TooltipContent className='[--tooltip-bg:var(--primary)] [--tooltip-fg:var(--primary-foreground)]'>
                                        Entities are filled from the selected notes
                                    </TooltipContent>
                                )}
                            </Tooltip>
                            <FieldDescription>
                                Leave empty to keep the request visible only to you
                                (unless you attach entities for shared access).
                            </FieldDescription>
                        </Field>

                        {/* Single artifact (optional if notes supply exactly one) */}
                        <Field>
                            <FieldLabel htmlFor='artifactInput'>
                                Artifact <span className='text-destructive'>*</span>
                            </FieldLabel>
                            <textarea
                                id='artifactInput'
                                name='artifactInput'
                                className='flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
                                placeholder='One line only, e.g. ip:203.0.113.1 or domain:example.com'
                                value={formData.artifactInput}
                                onChange={handleChange}
                                required={selectedNoteIds.size === 0}
                            />
                        </Field>
                    </FieldGroup>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                disabled={
                                    createMutation.isPending || initialDataLoading
                                }
                            >
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            type='submit'
                            variant='default'
                            size='sm'
                            disabled={createMutation.isPending || initialDataLoading}
                        >
                            {createMutation.isPending ? (
                                'Creating...'
                            ) : initialDataLoading ? (
                                <>
                                    <Spinner className='mr-2' /> Loading...
                                </>
                            ) : (
                                'Create Request'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
