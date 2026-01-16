import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSeparator,
    FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { GraphEdge } from '@/types/index';
import { InfoCircle } from 'iconoir-react';
import { ChangeEvent } from 'react';

interface Node {
    [key: string]: any;
}

interface GraphConfig {
    nodeRadiusCoefficient: number;
    linkWidthCoefficient: number;
    showLinks?: boolean;
    curvedLinks?: boolean;
    scaleLinksOnZoom?: boolean;
    showLinkWidthLegend?: boolean;
    simulationGravity: number;
    simulationRepulsion: number;
    simulationLinkSpring: number;
    simulationLinkDistance: number;
    simulationFriction: number;
    simulationCluster: number;
    simulationDecay: number;
    randomSeed?: string | number;
}

const PRESET: Partial<GraphConfig> = {
    // Spread out + untangle for dense graphs - optimized for minimal overlaps
    simulationGravity: 0.15,
    simulationRepulsion: 1.6,
    simulationLinkSpring: 0.6,
    simulationLinkDistance: 16,
    simulationFriction: 0.75,
    simulationDecay: 10000,
};

interface GraphSettingsProps {
    config: GraphConfig;
    setConfig: (config: GraphConfig | ((prev: GraphConfig) => GraphConfig)) => void;
    nodes: Node[];
    edges: GraphEdge[];
    entryGraphColors?: Record<string, string>;
    disabledTypes?: Set<string>;
    toggleDisabledType?: (type: string) => void;
    setDisabledTypes?: (
        types: Set<string> | ((prev: Set<string>) => Set<string>),
    ) => void;
}

export default function GraphSettings({
    config,
    setConfig,
    nodes,
    edges,
}: GraphSettingsProps) {
    const applyPreset = () => {
        setConfig((prev) => ({
            ...prev,
            ...PRESET,
        }));
    };

    return (
        <div className='px-4 pt-3'>
            <Tabs defaultValue='points' className='w-full'>
                <TabsList className='grid w-full grid-cols-3'>
                    <TabsTrigger value='points'>Points</TabsTrigger>
                    <TabsTrigger value='links'>Links</TabsTrigger>
                    <TabsTrigger value='simulation'>Simulation</TabsTrigger>
                </TabsList>
                <TabsContent value='points' className='mt-4'>
                    <FieldSet>
                        <FieldLegend variant='label'>Point Settings</FieldLegend>
                        <FieldGroup>
                            <Field>
                                <div className='flex items-center justify-between w-full'>
                                    <div className='flex items-center gap-1.5'>
                                        <FieldLabel>Node Size</FieldLabel>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <InfoCircle className='w-3.5 h-3.5 text-muted-foreground cursor-help' />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>
                                                    Controls the size of nodes in the
                                                    graph
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Input
                                        type='number'
                                        min={0.5}
                                        max={3}
                                        step={0.1}
                                        value={config.nodeRadiusCoefficient}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                            setConfig((prev) => ({
                                                ...prev,
                                                nodeRadiusCoefficient: Number(
                                                    e.target.value,
                                                ),
                                            }))
                                        }
                                        className='w-16 text-xs px-2 py-1'
                                    />
                                </div>
                                <Slider
                                    min={0.5}
                                    max={3}
                                    step={0.1}
                                    value={[config.nodeRadiusCoefficient]}
                                    onValueChange={(values) =>
                                        setConfig((prev) => ({
                                            ...prev,
                                            nodeRadiusCoefficient: values[0],
                                        }))
                                    }
                                    className='w-full'
                                />
                            </Field>
                        </FieldGroup>
                    </FieldSet>
                </TabsContent>
                <TabsContent value='links' className='mt-4'>
                    {/* General Category */}
                    <FieldSet>
                        <FieldLegend variant='label'>General</FieldLegend>
                        <FieldGroup>
                            <Field>
                                <div className='flex items-center gap-2'>
                                    <Checkbox
                                        id='showLinks'
                                        checked={config.showLinks ?? true}
                                        onCheckedChange={(checked) =>
                                            setConfig((prev) => ({
                                                ...prev,
                                                showLinks: checked === true,
                                            }))
                                        }
                                    />
                                    <div className='flex items-center gap-1.5'>
                                        <FieldLabel htmlFor='showLinks'>
                                            Show links
                                        </FieldLabel>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <InfoCircle className='w-3.5 h-3.5 text-muted-foreground cursor-help' />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>
                                                    Toggle visibility of links/edges in
                                                    the graph
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            </Field>
                            <Field>
                                <div className='flex items-center gap-2'>
                                    <Checkbox
                                        id='curvedLinks'
                                        checked={config.curvedLinks ?? false}
                                        onCheckedChange={(checked) =>
                                            setConfig((prev) => ({
                                                ...prev,
                                                curvedLinks: checked === true,
                                            }))
                                        }
                                    />
                                    <div className='flex items-center gap-1.5'>
                                        <FieldLabel htmlFor='curvedLinks'>
                                            Curved links
                                        </FieldLabel>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <InfoCircle className='w-3.5 h-3.5 text-muted-foreground cursor-help' />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>
                                                    Display links as curved arcs instead
                                                    of straight lines
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            </Field>
                        </FieldGroup>
                    </FieldSet>

                    <FieldSeparator />

                    {/* Width Category */}
                    <FieldSet>
                        <FieldLegend variant='label'>Width</FieldLegend>
                        <FieldGroup>
                            <Field>
                                <div className='flex items-center justify-between w-full'>
                                    <div className='flex items-center gap-1.5'>
                                        <FieldLabel>Width scale</FieldLabel>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <InfoCircle className='w-3.5 h-3.5 text-muted-foreground cursor-help' />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>
                                                    Controls the width of links/edges in
                                                    the graph
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Input
                                        type='number'
                                        min={0.5}
                                        max={2}
                                        step={0.1}
                                        value={config.linkWidthCoefficient}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                            setConfig((prev) => ({
                                                ...prev,
                                                linkWidthCoefficient: Number(
                                                    e.target.value,
                                                ),
                                            }))
                                        }
                                        className='w-16 text-xs px-2 py-1'
                                    />
                                </div>
                                <Slider
                                    min={0.5}
                                    max={2}
                                    step={0.1}
                                    value={[config.linkWidthCoefficient]}
                                    onValueChange={(values) =>
                                        setConfig((prev) => ({
                                            ...prev,
                                            linkWidthCoefficient: values[0],
                                        }))
                                    }
                                    className='w-full'
                                />
                            </Field>
                            <Field>
                                <div className='flex items-center gap-2'>
                                    <Checkbox
                                        id='scaleLinksOnZoom'
                                        checked={config.scaleLinksOnZoom ?? false}
                                        onCheckedChange={(checked) =>
                                            setConfig((prev) => ({
                                                ...prev,
                                                scaleLinksOnZoom: checked === true,
                                            }))
                                        }
                                    />
                                    <div className='flex items-center gap-1.5'>
                                        <FieldLabel htmlFor='scaleLinksOnZoom'>
                                            Scale links on zoom
                                        </FieldLabel>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <InfoCircle className='w-3.5 h-3.5 text-muted-foreground cursor-help' />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>
                                                    Scale link width proportionally when
                                                    zooming
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            </Field>
                            <Field>
                                <div className='flex items-center gap-2'>
                                    <Checkbox
                                        id='showLinkWidthLegend'
                                        checked={config.showLinkWidthLegend ?? false}
                                        onCheckedChange={(checked) =>
                                            setConfig((prev) => ({
                                                ...prev,
                                                showLinkWidthLegend: checked === true,
                                            }))
                                        }
                                    />
                                    <div className='flex items-center gap-1.5'>
                                        <FieldLabel htmlFor='showLinkWidthLegend'>
                                            Show link width legend
                                        </FieldLabel>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <InfoCircle className='w-3.5 h-3.5 text-muted-foreground cursor-help' />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>
                                                    Display a legend showing link width
                                                    scale
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            </Field>
                        </FieldGroup>
                    </FieldSet>
                </TabsContent>
                <TabsContent value='simulation' className='mt-4'>
                    <ScrollArea className='max-h-[60vh]'>
                        <div className='pr-4'>
                            <FieldSet>
                                <div className='flex items-center justify-between mb-2'>
                                    <FieldLegend variant='label'>
                                        Simulation Settings
                                    </FieldLegend>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={applyPreset}
                                        className='text-xs h-6 px-2'
                                    >
                                        Reset to Preset
                                    </Button>
                                </div>
                                <FieldGroup>
                                    {[
                                        {
                                            label: 'Gravity',
                                            description:
                                                'Pulls nodes toward the center. Lower values allow more spreading.',
                                            value: config.simulationGravity,
                                            min: 0,
                                            max: 0.5,
                                            step: 0.01,
                                            key: 'simulationGravity' as keyof GraphConfig,
                                        },
                                        {
                                            label: 'Repulsion',
                                            description:
                                                'Force pushing nodes apart. Higher values reduce overlaps.',
                                            value: config.simulationRepulsion,
                                            min: 0,
                                            max: 2,
                                            step: 0.01,
                                            key: 'simulationRepulsion' as keyof GraphConfig,
                                        },
                                        {
                                            label: 'Link Strength',
                                            description:
                                                'How strongly edges pull connected nodes together. Lower values allow more separation.',
                                            value: config.simulationLinkSpring,
                                            min: 0,
                                            max: 2,
                                            step: 0.01,
                                            key: 'simulationLinkSpring' as keyof GraphConfig,
                                        },
                                        {
                                            label: 'Link Distance',
                                            description:
                                                'Preferred distance between connected nodes. Higher values reduce overlaps.',
                                            value: config.simulationLinkDistance,
                                            min: 1,
                                            max: 20,
                                            step: 1,
                                            key: 'simulationLinkDistance' as keyof GraphConfig,
                                        },
                                        {
                                            label: 'Friction',
                                            description:
                                                'Resistance to movement. Lower values allow more untangling.',
                                            value: config.simulationFriction,
                                            min: 0,
                                            max: 1,
                                            step: 0.01,
                                            key: 'simulationFriction' as keyof GraphConfig,
                                        },
                                        {
                                            label: 'Cluster Repulsion',
                                            description:
                                                'Force separating clusters. Higher values increase cluster separation.',
                                            value: config.simulationCluster,
                                            min: 0,
                                            max: 1,
                                            step: 0.01,
                                            key: 'simulationCluster' as keyof GraphConfig,
                                        },
                                        {
                                            label: 'Decay',
                                            description:
                                                'How quickly the simulation cools down. Higher values allow more time to untangle.',
                                            value: config.simulationDecay,
                                            min: 1000,
                                            max: 15000,
                                            step: 250,
                                            key: 'simulationDecay' as keyof GraphConfig,
                                        },
                                    ].map(
                                        ({
                                            label,
                                            description,
                                            value,
                                            min,
                                            max,
                                            step,
                                            key,
                                        }) => (
                                            <Field key={key}>
                                                <div className='flex items-center justify-between w-full'>
                                                    <div className='flex items-center gap-1.5'>
                                                        <FieldLabel>{label}</FieldLabel>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <InfoCircle className='w-3.5 h-3.5 text-muted-foreground cursor-help' />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{description}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                    <Input
                                                        type='number'
                                                        min={min}
                                                        max={max}
                                                        step={step}
                                                        value={value}
                                                        onChange={(
                                                            e: ChangeEvent<HTMLInputElement>,
                                                        ) =>
                                                            setConfig((prev) => ({
                                                                ...prev,
                                                                [key]: Number(
                                                                    e.target.value,
                                                                ),
                                                            }))
                                                        }
                                                        className='w-16 text-xs px-2 py-1'
                                                    />
                                                </div>
                                                <Slider
                                                    min={min}
                                                    max={max}
                                                    step={step}
                                                    value={[value]}
                                                    onValueChange={(values) =>
                                                        setConfig((prev) => ({
                                                            ...prev,
                                                            [key]: values[0],
                                                        }))
                                                    }
                                                    className='w-full'
                                                />
                                            </Field>
                                        ),
                                    )}
                                </FieldGroup>
                            </FieldSet>

                            <FieldSeparator />

                            {/* Random Seed */}
                            <FieldSet>
                                <Field>
                                    <FieldLabel>
                                        <div className='flex items-center gap-1.5'>
                                            <span>Random Seed</span>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <InfoCircle className='w-3.5 h-3.5 text-muted-foreground cursor-help' />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>
                                                        Set a seed for consistent
                                                        layouts across reloads
                                                    </p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </FieldLabel>
                                    <Input
                                        type='text'
                                        value={config.randomSeed ?? ''}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                            setConfig((prev) => ({
                                                ...prev,
                                                randomSeed:
                                                    e.target.value === ''
                                                        ? undefined
                                                        : isNaN(Number(e.target.value))
                                                          ? e.target.value
                                                          : Number(e.target.value),
                                            }))
                                        }
                                        placeholder='42 or "my-seed"'
                                        className='w-full text-xs px-2 py-1'
                                    />
                                </Field>
                            </FieldSet>
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    );
}
