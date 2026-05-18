import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon } from '@phosphor-icons/react';
import { ChangeEvent } from 'react';

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
}

export default function GraphSettings({ config, setConfig }: GraphSettingsProps) {
    const applyPreset = () => {
        setConfig((prev) => ({
            ...prev,
            ...PRESET,
        }));
    };

    const simulationSettings = [
        {
            label: 'Gravity',
            description: 'Pulls nodes toward center',
            value: config.simulationGravity,
            min: 0,
            max: 0.5,
            step: 0.01,
            key: 'simulationGravity' as keyof GraphConfig,
        },
        {
            label: 'Repulsion',
            description: 'Force pushing nodes apart',
            value: config.simulationRepulsion,
            min: 0,
            max: 2,
            step: 0.01,
            key: 'simulationRepulsion' as keyof GraphConfig,
        },
        {
            label: 'Link Strength',
            description: 'How strongly edges pull nodes together',
            value: config.simulationLinkSpring,
            min: 0,
            max: 2,
            step: 0.01,
            key: 'simulationLinkSpring' as keyof GraphConfig,
        },
        {
            label: 'Link Distance',
            description: 'Preferred distance between connected nodes',
            value: config.simulationLinkDistance,
            min: 1,
            max: 20,
            step: 1,
            key: 'simulationLinkDistance' as keyof GraphConfig,
        },
        {
            label: 'Friction',
            description: 'Resistance to movement',
            value: config.simulationFriction,
            min: 0,
            max: 1,
            step: 0.01,
            key: 'simulationFriction' as keyof GraphConfig,
        },
        {
            label: 'Decay',
            description: 'How quickly simulation stabilizes',
            value: config.simulationDecay,
            min: 1000,
            max: 15000,
            step: 250,
            key: 'simulationDecay' as keyof GraphConfig,
        },
    ];

    return (
        <div className='px-4 pt-3'>
            <Tabs defaultValue='appearance' className='w-full'>
                <TabsList className='flex-nowrap overflow-x-auto overflow-y-hidden w-full md:w-fit min-w-0 h-auto justify-start md:justify-center [&>button]:shrink-0 [&>button]:flex-none'>
                    <TabsTrigger value='appearance'>Appearance</TabsTrigger>
                    <TabsTrigger value='physics'>Physics</TabsTrigger>
                    <TabsTrigger value='advanced'>Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value='appearance' className='mt-3'>
                    <ScrollArea className='max-h-[50vh]'>
                        <FieldGroup className='gap-4'>
                            {/* Node Size */}
                            <Field>
                                <div className='flex items-center justify-between w-full mb-1.5'>
                                    <FieldLabel className='text-xs'>
                                        Node Size
                                    </FieldLabel>
                                    <span className='text-xs text-muted-foreground tabular-nums'>
                                        {config.nodeRadiusCoefficient.toFixed(1)}x
                                    </span>
                                </div>
                                <Slider
                                    min={0.5}
                                    max={3}
                                    step={0.1}
                                    value={[config.nodeRadiusCoefficient]}
                                    onValueChange={(values) => {
                                        const v = values[0];
                                        if (v === undefined) return;
                                        setConfig((prev) => ({
                                            ...prev,
                                            nodeRadiusCoefficient: v,
                                        }));
                                    }}
                                />
                            </Field>

                            {/* Link Width */}
                            <Field>
                                <div className='flex items-center justify-between w-full mb-1.5'>
                                    <FieldLabel className='text-xs'>
                                        Link Width
                                    </FieldLabel>
                                    <span className='text-xs text-muted-foreground tabular-nums'>
                                        {config.linkWidthCoefficient.toFixed(1)}x
                                    </span>
                                </div>
                                <Slider
                                    min={0.5}
                                    max={2}
                                    step={0.1}
                                    value={[config.linkWidthCoefficient]}
                                    onValueChange={(values) => {
                                        const v = values[0];
                                        if (v === undefined) return;
                                        setConfig((prev) => ({
                                            ...prev,
                                            linkWidthCoefficient: v,
                                        }));
                                    }}
                                />
                            </Field>

                            <div className='border-t pt-3 space-y-2'>
                                <Field orientation='horizontal'>
                                    <FieldContent className='flex-1'>
                                        <FieldLabel
                                            htmlFor='showLinks'
                                            className='text-xs'
                                        >
                                            Show links
                                        </FieldLabel>
                                    </FieldContent>
                                    <Switch
                                        id='showLinks'
                                        size='sm'
                                        checked={config.showLinks ?? true}
                                        onCheckedChange={(checked) =>
                                            setConfig((prev) => ({
                                                ...prev,
                                                showLinks: checked,
                                            }))
                                        }
                                        className='self-start md:self-center'
                                    />
                                </Field>
                                <Field orientation='horizontal'>
                                    <FieldContent className='flex-1'>
                                        <FieldLabel
                                            htmlFor='curvedLinks'
                                            className='text-xs'
                                        >
                                            Curved links
                                        </FieldLabel>
                                    </FieldContent>
                                    <Switch
                                        id='curvedLinks'
                                        size='sm'
                                        checked={config.curvedLinks ?? false}
                                        onCheckedChange={(checked) =>
                                            setConfig((prev) => ({
                                                ...prev,
                                                curvedLinks: checked,
                                            }))
                                        }
                                        className='self-start md:self-center'
                                    />
                                </Field>
                            </div>
                        </FieldGroup>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value='physics' className='mt-3'>
                    <ScrollArea className='max-h-[50vh]'>
                        <div className='pr-2'>
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={applyPreset}
                                className='w-full text-xs h-7 mb-3'
                            >
                                Reset to defaults
                            </Button>

                            <FieldGroup className='gap-4'>
                                {simulationSettings.map(
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
                                            <div className='flex items-center justify-between w-full mb-1'>
                                                <div className='flex items-center gap-1'>
                                                    <FieldLabel className='text-xs'>
                                                        {label}
                                                    </FieldLabel>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <InfoIcon
                                                                className='size-3 text-muted-foreground cursor-help'
                                                                weight='bold'
                                                            />
                                                        </TooltipTrigger>
                                                        <TooltipContent side='right'>
                                                            <p className='text-xs'>
                                                                {description}
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                                <span className='text-xs text-muted-foreground tabular-nums w-12 text-right'>
                                                    {typeof value === 'number' &&
                                                    value >= 100
                                                        ? value.toFixed(0)
                                                        : value.toFixed(2)}
                                                </span>
                                            </div>
                                            <Slider
                                                min={min}
                                                max={max}
                                                step={step}
                                                value={[value]}
                                                onValueChange={(values) => {
                                                    const v = values[0];
                                                    if (v === undefined) return;
                                                    setConfig((prev) => ({
                                                        ...prev,
                                                        [key]: v,
                                                    }));
                                                }}
                                            />
                                        </Field>
                                    ),
                                )}
                            </FieldGroup>
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value='advanced' className='mt-3'>
                    <ScrollArea className='max-h-[50vh]'>
                        <FieldGroup className='gap-4'>
                            {/* Random Seed */}
                            <Field>
                                <div className='flex items-center gap-1 mb-1.5'>
                                    <FieldLabel className='text-xs'>
                                        Random Seed
                                    </FieldLabel>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <InfoIcon
                                                className='size-3 text-muted-foreground cursor-help'
                                                weight='bold'
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent side='right'>
                                            <p className='text-xs'>
                                                Set a seed for consistent layouts
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
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
                                    className='w-full text-xs h-8'
                                />
                            </Field>

                            {/* Cluster Separation */}
                            <Field>
                                <div className='flex items-center justify-between w-full mb-1'>
                                    <div className='flex items-center gap-1'>
                                        <FieldLabel className='text-xs'>
                                            Cluster Separation
                                        </FieldLabel>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <InfoIcon
                                                    className='size-3 text-muted-foreground cursor-help'
                                                    weight='bold'
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent side='right'>
                                                <p className='text-xs'>
                                                    Force separating node clusters
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <span className='text-xs text-muted-foreground tabular-nums'>
                                        {config.simulationCluster.toFixed(2)}
                                    </span>
                                </div>
                                <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[config.simulationCluster]}
                                    onValueChange={(values) => {
                                        const v = values[0];
                                        if (v === undefined) return;
                                        setConfig((prev) => ({
                                            ...prev,
                                            simulationCluster: v,
                                        }));
                                    }}
                                />
                            </Field>

                            <div className='border-t pt-3 space-y-2'>
                                <Field orientation='horizontal'>
                                    <FieldContent className='flex-1'>
                                        <FieldLabel
                                            htmlFor='scaleLinksOnZoom'
                                            className='text-xs'
                                        >
                                            Scale links on zoom
                                        </FieldLabel>
                                    </FieldContent>
                                    <Switch
                                        id='scaleLinksOnZoom'
                                        size='sm'
                                        checked={config.scaleLinksOnZoom ?? false}
                                        onCheckedChange={(checked) =>
                                            setConfig((prev) => ({
                                                ...prev,
                                                scaleLinksOnZoom: checked,
                                            }))
                                        }
                                        className='self-start md:self-center'
                                    />
                                </Field>
                            </div>
                        </FieldGroup>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    );
}
