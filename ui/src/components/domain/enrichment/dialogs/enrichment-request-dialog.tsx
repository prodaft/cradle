import MultipleSelector, { type Option } from '@/components/custom/multi-select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    FieldTitle,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { queryKeys, useNdjsonQuery } from '@/hooks/query';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';

type OptimizedEntryResponse = components['schemas']['OptimizedEntryResponse'];

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
    notes?: Array<{
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
    notes,
}: EnrichmentRequestDialogProps): React.JSX.Element {
    const enrichmentTechniquesDescId = useId();
    const entitiesDescId = useId();

    const [selectedEntities, setSelectedEntities] = useState<
        Array<{ value: number; label: string }>
    >([]);
    const [isInitialDataLoading, setIsInitialDataLoading] = useState(false);
    const [checkedIds, setCheckedIds] = useState<Set<string>>(
        () => new Set(notes?.map((n) => n.id) || []),
    );

    const [form, setForm] = useState<EnrichmentFormData>({
        title: '',
        enricherNames: [],
        entities: [],
        artifactInput: '',
    });

    const { data: enrichers, isLoading } = useQuery({
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

    const enricherTypes: Option[] = ((enrichers ?? []) as any[])
        .filter((enricher) => enricher.enabled)
        .map((enricher) => ({
            value: enricher.class_name,
            label: enricher.name,
        }));

    useEffect(() => {
        if (notes) {
            setCheckedIds(new Set(notes.map((n) => n.id)));
        }
    }, [notes]);

    const toggleNote = (id: string) => {
        setCheckedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    useEffect(() => {
        const entitiesById = new Map<number, OptimizedEntryResponse>();
        for (const note of notes || []) {
            if (!checkedIds.has(note.id)) continue;
            for (const entity of note.entities) {
                if (typeof entity.id === 'number') {
                    entitiesById.set(entity.id, entity);
                }
            }
        }

        const entityArr = Array.from(entitiesById.values());
        setSelectedEntities(
            entityArr.map((entity) => ({
                value: entity.id as number,
                label: entity.name,
            })),
        );
        setForm((prev) => ({
            ...prev,
            entities: entityArr.map((entity) => entity.id as number),
        }));
    }, [checkedIds, notes]);

    const { data: allEntities } = useNdjsonQuery({
        path: '/entries/entities/stream/',
        queryKey: queryKeys.entities.list(),
        enabled: open,
        meta: {
            showErrorToast: true,
        },
    });

    useEffect(() => {
        const loadInitialData = async () => {
            if (!entitiesList && !artifactsList) {
                return;
            }

            setIsInitialDataLoading(true);
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

                let resolvedEntities: number[] | undefined;
                if (entitiesList && allEntities) {
                    const entities = await Promise.resolve(entitiesList);
                    if (isNumberArray(entities)) {
                        resolvedEntities = entities;
                    } else if (isTypedEntityArray(entities)) {
                        resolvedEntities = entities
                            .map((entity) => {
                                const match = allEntities.find(
                                    (e) =>
                                        e.name === entity.value &&
                                        e.subtype === entity.type,
                                );
                                return match?.id;
                            })
                            .filter((id): id is number => typeof id === 'number');
                    }
                }

                let resolvedArtifacts: string | undefined;
                if (artifactsList) {
                    resolvedArtifacts = await Promise.resolve(artifactsList);
                }

                let entityOptions: Array<{ value: number; label: string }> = [];
                if (resolvedEntities && resolvedEntities.length > 0 && allEntities) {
                    entityOptions = allEntities
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

                setForm((prev) => ({
                    ...prev,
                    entities: resolvedEntities || prev.entities,
                    artifactInput: resolvedArtifacts || prev.artifactInput,
                }));

                if (entityOptions.length > 0) {
                    setSelectedEntities(entityOptions);
                }
            } catch (error) {
                console.error('Failed to load initial data:', error);
                if (onError) {
                    onError(error as Error);
                }
            } finally {
                setIsInitialDataLoading(false);
            }
        };

        if (allEntities || artifactsList) {
            loadInitialData();
        }
    }, [entitiesList, artifactsList, allEntities, onError]);

    const updateField = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const updateEnrichers = (options?: Option[]) => {
        const enricherNames = (options ?? []).map((opt) => String(opt.value));
        setForm((prev) => ({
            ...prev,
            enricherNames,
        }));
    };

    const updateEntities = (options?: Option[]) => {
        const selected = (options ?? []).map((o) => ({
            value: Number(o.value),
            label: o.label,
        }));
        const entities = selected.map((opt) => opt.value);
        setSelectedEntities(selected);
        setForm((prev) => ({
            ...prev,
            entities,
        }));
    };

    const parseRequestText = (text: string): RequestArtifact[] => {
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

    const createRequest = useMutation({
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

    const submit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!form.title.trim()) {
            toast.error('Title is required');
            return;
        }
        if (!form.enricherNames || form.enricherNames.length === 0) {
            toast.error('At least one enrichment technique must be selected');
            return;
        }
        if (!form.artifactInput.trim() && checkedIds.size === 0) {
            toast.error('Specify one artifact or select at least one note');
            return;
        }

        const parsedRequest = parseRequestText(form.artifactInput);
        if (parsedRequest.length > 1) {
            toast.error(
                'Only one artifact per enrichment request. Use a single line: type:value',
            );
            return;
        }
        if (parsedRequest.length === 0 && checkedIds.size === 0) {
            toast.error(
                'Enter one line as type:value, or select notes that yield a single artifact',
            );
            return;
        }

        const artifact = parsedRequest.length === 1 ? parsedRequest[0]! : undefined;

        createRequest.mutate(
            {
                title: form.title,
                enricherNames: form.enricherNames,
                artifact,
                entities: form.entities,
                notes: Array.from(checkedIds),
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
                <form onSubmit={submit} className='contents'>
                    <DialogHeader>
                        <DialogTitle>Enrichment Request</DialogTitle>
                        <DialogDescription>
                            Create a new enrichment request to process entities with
                            selected enrichment techniques.
                        </DialogDescription>
                    </DialogHeader>
                    {/* Selected Notes List */}
                    {notes && notes.length > 0 && (
                        <FieldSet>
                            <FieldLegend>
                                Selected Notes ({checkedIds.size})
                            </FieldLegend>
                            <ScrollArea className='border border-border rounded-lg max-h-48'>
                                <ul>
                                    {notes.map((note) => {
                                        const isChecked = checkedIds.has(note.id);
                                        return (
                                            <li
                                                key={note.id}
                                                className={`flex items-center gap-3 px-4 py-2 border-b border-border last:border-b-0 transition-colors ${
                                                    isChecked
                                                        ? 'hover:bg-secondary/50'
                                                        : 'bg-secondary/10'
                                                }`}
                                            >
                                                <Checkbox
                                                    checked={isChecked}
                                                    onCheckedChange={() =>
                                                        toggleNote(note.id)
                                                    }
                                                    aria-label={
                                                        isChecked
                                                            ? `Deselect note ${
                                                                  note.title ||
                                                                  'Untitled'
                                                              }`
                                                            : `Select note ${
                                                                  note.title ||
                                                                  'Untitled'
                                                              }`
                                                    }
                                                />
                                                <span
                                                    className={`text-sm truncate flex-1 ${
                                                        isChecked
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
                        {/* Native fields: FieldLabel + htmlFor. Multi-select: FieldTitle + combobox aria-* (cmdk overwrites input id / aria-labelledby). */}
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
                                value={form.title}
                                onChange={updateField}
                                required
                            />
                        </Field>

                        {/* Enrichment Techniques */}
                        <Field>
                            <FieldTitle>
                                Enrichment Techniques{' '}
                                <span className='text-destructive'>*</span>
                            </FieldTitle>
                            {isLoading ? (
                                <div className='flex items-center gap-2 py-1 text-muted-foreground text-sm'>
                                    <Spinner className='size-4' />
                                    Loading enrichment techniques...
                                </div>
                            ) : null}
                            <MultipleSelector
                                inputProps={{
                                    'aria-label': 'Enrichment Techniques',
                                    'aria-describedby': enrichmentTechniquesDescId,
                                    'aria-required': true,
                                }}
                                value={enricherTypes.filter((e) =>
                                    form.enricherNames.includes(e.value),
                                )}
                                defaultOptions={enricherTypes}
                                placeholder='Select enrichment techniques...'
                                disabled={isLoading}
                                onChange={updateEnrichers}
                                emptyIndicator={
                                    <Empty className='min-h-0 border-0 p-4 shadow-none'>
                                        <EmptyHeader className='max-w-none gap-0'>
                                            <EmptyDescription>
                                                No enrichment techniques found
                                            </EmptyDescription>
                                        </EmptyHeader>
                                    </Empty>
                                }
                            />
                            <FieldDescription id={enrichmentTechniquesDescId}>
                                Select one or more enrichment techniques to apply
                            </FieldDescription>
                        </Field>

                        {/* Entities - access scope for who can see this request */}
                        <Field>
                            <FieldTitle>Entities</FieldTitle>
                            <Tooltip>
                                <TooltipTrigger render={<div className='w-full' />}>
                                    <MultipleSelector
                                        inputProps={{
                                            'aria-label': 'Entities',
                                            'aria-describedby': entitiesDescId,
                                        }}
                                        value={
                                            selectedEntities.map((e) => ({
                                                value: String(e.value),
                                                label: e.label,
                                            })) as Option[]
                                        }
                                        defaultOptions={
                                            ((allEntities ?? [])
                                                .filter((e) => typeof e.id === 'number')
                                                .map((e) => ({
                                                    value: String(e.id),
                                                    label: e.name,
                                                })) as Option[]) || []
                                        }
                                        placeholder='Select entities for access scope...'
                                        disabled={checkedIds.size > 0}
                                        onChange={updateEntities}
                                        emptyIndicator={
                                            <Empty className='min-h-0 border-0 p-4 shadow-none'>
                                                <EmptyHeader className='max-w-none gap-0'>
                                                    <EmptyDescription>
                                                        No entities found
                                                    </EmptyDescription>
                                                </EmptyHeader>
                                            </Empty>
                                        }
                                    />
                                </TooltipTrigger>
                                {checkedIds.size > 0 && (
                                    <TooltipContent className='[--tooltip-bg:var(--primary)] [--tooltip-fg:var(--primary-foreground)]'>
                                        Entities are filled from the selected notes
                                    </TooltipContent>
                                )}
                            </Tooltip>
                            <FieldDescription id={entitiesDescId}>
                                Leave empty to keep the request visible only to you
                                (unless you attach entities for shared access).
                            </FieldDescription>
                        </Field>

                        {/* Single artifact (optional if notes supply exactly one) */}
                        <Field>
                            <FieldLabel htmlFor='artifactInput'>
                                Artifact <span className='text-destructive'>*</span>
                            </FieldLabel>
                            <Textarea
                                id='artifactInput'
                                name='artifactInput'
                                className='min-h-[80px]'
                                placeholder='One line only, e.g. ip:203.0.113.1 or domain:example.com'
                                value={form.artifactInput}
                                onChange={updateField}
                                required={checkedIds.size === 0}
                            />
                        </Field>
                    </FieldGroup>
                    <DialogFooter>
                        <DialogClose
                            render={
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    disabled={
                                        createRequest.isPending || isInitialDataLoading
                                    }
                                />
                            }
                        >
                            Cancel
                        </DialogClose>
                        <Button
                            type='submit'
                            variant='default'
                            size='sm'
                            disabled={createRequest.isPending || isInitialDataLoading}
                        >
                            {createRequest.isPending ? (
                                <>
                                    <Spinner />
                                    Creating...
                                </>
                            ) : isInitialDataLoading ? (
                                <>
                                    <Spinner />
                                    Loading...
                                </>
                            ) : (
                                <>
                                    <Sparkles data-icon='inline-start' />
                                    Create
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
