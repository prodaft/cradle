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
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className='flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-cradle-accent-primary transition-colors'
            >
                {isExpanded ? (
                    <NavArrowDown width='16' height='16' />
                ) : (
                    <NavArrowRight width='16' height='16' />
                )}
                <span>Settings</span>
            </button>
            {isExpanded && (
                <div className='mt-4 space-y-4'>
                    {/* Layout Mode Selector */}
                    <div className='flex flex-col gap-2'>
                        <label className='text-sm font-medium'>Layout Mode</label>
                        <select
                            value={config.layoutMode}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                setConfig((prev) => ({
                                    ...prev,
                                    layoutMode: e.target.value as LayoutMode,
                                }))
                            }
                            className='cradle-input text-sm px-3 py-2 capitalize'
                        >
                            {(
                                [
                                    'circular',
                                    'grid',
                                    'cluster',
                                    'random',
                                ] as LayoutMode[]
                            ).map((mode) => (
                                <option key={mode} value={mode} className='capitalize'>
                                    {mode}
                                </option>
                            ))}
                        </select>
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
                                <label className='text-sm font-medium'>{label}</label>
                                <input
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
                                    className='cradle-input w-16 text-xs px-2 py-1'
                                />
                            </div>
                            <input
                                type='range'
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
                                className='w-full accent-cradle-accent-primary'
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
