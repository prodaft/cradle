import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
                <TabsList className='grid w-full grid-cols-3'>
                    <TabsTrigger value='appearance'>Appearance</TabsTrigger>
                    <TabsTrigger value='physics'>Physics</TabsTrigger>
                    <TabsTrigger value='advanced'>Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value='appearance' className='mt-3'>
                    <ScrollArea className='max-h-[50vh]'>
                        <div className='space-y-3'>
                            {/* Node Size */}
                            <div>
                                <div className='flex items-center justify-between w-full mb-1.5'>
                                    <Label className='text-xs'>Node Size</Label>
                                    <span className='text-xs text-muted-foreground tabular-nums'>
                                        {config.nodeRadiusCoefficient.toFixed(1)}x
                                    </span>
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
                                />
                            </div>

                            {/* Link Width */}
                            <div>
                                <div className='flex items-center justify-between w-full mb-1.5'>
                                    <Label className='text-xs'>Link Width</Label>
                                    <span className='text-xs text-muted-foreground tabular-nums'>
                                        {config.linkWidthCoefficient.toFixed(1)}x
                                    </span>
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
                                />
                            </div>

                            <div className='border-t pt-3 space-y-2'>
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
                                    <Label htmlFor='showLinks' className='text-xs'>
                                        Show links
                                    </Label>
                                </div>
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
                                    <Label htmlFor='curvedLinks' className='text-xs'>
                                        Curved links
                                    </Label>
                                </div>
                            </div>
                        </div>
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

                            <div className='space-y-2.5'>
                                {simulationSettings.map(
                                    ({ label, description, value, min, max, step, key }) => (
                                        <div key={key}>
                                            <div className='flex items-center justify-between w-full mb-1'>
                                                <div className='flex items-center gap-1'>
                                                    <Label className='text-xs'>{label}</Label>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <InfoCircle className='size-3 text-muted-foreground cursor-help' />
                                                        </TooltipTrigger>
                                                        <TooltipContent side='right'>
                                                            <p className='text-xs'>{description}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                                <span className='text-xs text-muted-foreground tabular-nums w-12 text-right'>
                                                    {typeof value === 'number' && value >= 100
                                                        ? value.toFixed(0)
                                                        : value.toFixed(2)}
                                                </span>
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
                                            />
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value='advanced' className='mt-3'>
                    <ScrollArea className='max-h-[50vh]'>
                        <div className='space-y-3'>
                            {/* Random Seed */}
                            <div>
                                <div className='flex items-center gap-1 mb-1.5'>
                                    <Label className='text-xs'>Random Seed</Label>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <InfoCircle className='size-3 text-muted-foreground cursor-help' />
                                        </TooltipTrigger>
                                        <TooltipContent side='right'>
                                            <p className='text-xs'>Set a seed for consistent layouts</p>
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
                            </div>

                            {/* Cluster Separation */}
                            <div>
                                <div className='flex items-center justify-between w-full mb-1'>
                                    <div className='flex items-center gap-1'>
                                        <Label className='text-xs'>Cluster Separation</Label>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <InfoCircle className='size-3 text-muted-foreground cursor-help' />
                                            </TooltipTrigger>
                                            <TooltipContent side='right'>
                                                <p className='text-xs'>Force separating node clusters</p>
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
                                    onValueChange={(values) =>
                                        setConfig((prev) => ({
                                            ...prev,
                                            simulationCluster: values[0],
                                        }))
                                    }
                                />
                            </div>

                            <div className='border-t pt-3 space-y-2'>
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
                                    <Label htmlFor='scaleLinksOnZoom' className='text-xs'>
                                        Scale links on zoom
                                    </Label>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    );
}
