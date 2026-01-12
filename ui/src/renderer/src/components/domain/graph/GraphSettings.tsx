import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { GraphEdge } from '@/types/index';
import { NavArrowDown, NavArrowRight } from 'iconoir-react';
import { ChangeEvent, useState } from 'react';

interface Node {
    [key: string]: any;
}

type LayoutMode = 'circular' | 'grid' | 'cluster' | 'random';

interface GraphConfig {
    nodeRadiusCoefficient: number;
    linkWidthCoefficient: number;
    layoutMode: LayoutMode;
}

interface GraphSettingsProps {
    config: GraphConfig;
    setConfig: (config: GraphConfig | ((prev: GraphConfig) => GraphConfig)) => void;
    nodes: Node[];
    edges: GraphEdge[];
}

export default function GraphSettings({
    config,
    setConfig,
    nodes,
    edges,
}: GraphSettingsProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className='px-4 pt-3'>
            <Button
                variant='ghost'
                size='sm'
                onClick={() => setIsExpanded(!isExpanded)}
                className='flex items-center gap-2 text-sm font-medium hover:text-border-primary'
            >
                {isExpanded ? (
                    <NavArrowDown width='16' height='16' />
                ) : (
                    <NavArrowRight width='16' height='16' />
                )}
                Settings
            </Button>
            {isExpanded && (
                <div className='mt-4 space-y-4'>
                    {/* Layout Mode Selector */}
                    <div className='flex flex-col gap-2'>
                        <Label className='text-sm font-medium'>Layout Mode</Label>
                        <Select
                            value={config.layoutMode}
                            onValueChange={(value) =>
                                setConfig((prev) => ({
                                    ...prev,
                                    layoutMode: value as LayoutMode,
                                }))
                            }
                        >
                            <SelectTrigger className='w-full capitalize'>
                                <SelectValue placeholder='Select layout mode' />
                            </SelectTrigger>
                            <SelectContent>
                                {(
                                    [
                                        'circular',
                                        'grid',
                                        'cluster',
                                        'random',
                                    ] as LayoutMode[]
                                ).map((mode) => (
                                    <SelectItem
                                        key={mode}
                                        value={mode}
                                        className='capitalize'
                                    >
                                        {mode}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Size Controls */}
                    {[
                        {
                            label: 'Node Size',
                            value: config.nodeRadiusCoefficient,
                            min: 0.5,
                            max: 3,
                            step: 0.1,
                            key: 'nodeRadiusCoefficient' as keyof GraphConfig,
                        },
                        {
                            label: 'Link Width',
                            value: config.linkWidthCoefficient,
                            min: 0.5,
                            max: 2,
                            step: 0.1,
                            key: 'linkWidthCoefficient' as keyof GraphConfig,
                        },
                    ].map(({ label, value, min, max, step, key }) => (
                        <div key={key} className='flex flex-col gap-2'>
                            <div className='flex items-center justify-between'>
                                <Label className='text-sm font-medium'>{label}</Label>
                                <Input
                                    type='number'
                                    min={min}
                                    max={max}
                                    step={step}
                                    value={value}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                        setConfig((prev) => ({
                                            ...prev,
                                            [key]: Number(e.target.value),
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
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
