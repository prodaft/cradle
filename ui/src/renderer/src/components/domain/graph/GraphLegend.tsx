import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SubtypeHierarchy } from '@/utils/dashboard';
import { NavArrowDown, NavArrowRight } from 'iconoir-react';
import { ReactNode } from 'react';

interface GraphLegendProps {
    entryGraphColors: Record<string, string>;
    disabledTypes: Set<string>;
    toggleDisabledType: (type: string) => void;
    setDisabledTypes: (types: Set<string>) => void;
}

const GraphLegend = ({
    entryGraphColors,
    disabledTypes,
    toggleDisabledType,
    setDisabledTypes,
}: GraphLegendProps) => {
    if (!entryGraphColors || Object.keys(entryGraphColors).length === 0) return null;

    const toggleAllAtPath = (path: string, items: string[]) => {
        const allKeys = items.map((item) => path + item);
        const allDisabled = allKeys.every((key) => disabledTypes.has(key));

        const newDisabledTypes = new Set(disabledTypes);

        if (allDisabled) {
            // Enable all items in this group
            allKeys.forEach((key) => newDisabledTypes.delete(key));
        } else {
            // Disable all items in this group
            allKeys.forEach((key) => newDisabledTypes.add(key));
        }

        setDisabledTypes(newDisabledTypes);
    };

    const toggleAll = () => {
        const allKeys = Object.keys(entryGraphColors);
        const allDisabled = allKeys.every((key) => disabledTypes.has(key));

        const newDisabledTypes = new Set(disabledTypes);

        if (allDisabled) {
            // Enable all items
            allKeys.forEach((key) => newDisabledTypes.delete(key));
        } else {
            // Disable all items
            allKeys.forEach((key) => newDisabledTypes.add(key));
        }

        setDisabledTypes(newDisabledTypes);
    };

    const allItemsDisabled = Object.keys(entryGraphColors).every((key) =>
        disabledTypes.has(key),
    );

    return (
        <div className='px-4 pt-2'>
            <Collapsible defaultOpen={true}>
                <div className='flex justify-between items-center'>
                    <CollapsibleTrigger asChild>
                        <Button
                            variant='ghost'
                            size='sm'
                            className='group hover:text-border-primary'
                        >
                            <NavArrowRight className='w-4 h-4 group-data-[state=open]:hidden' />
                            <NavArrowDown className='w-4 h-4 hidden group-data-[state=open]:block' />
                            Legend
                        </Button>
                    </CollapsibleTrigger>
                    <Button
                        variant='ghost'
                        size='sm'
                        className='text-xs px-2 py-1 hover:bg-bg-card'
                        onClick={toggleAll}
                    >
                        {allItemsDisabled ? 'Show All' : 'Hide All'}
                    </Button>
                </div>
                <CollapsibleContent>
                    <div className='flex flex-wrap gap-1 mt-4'>
                        {new SubtypeHierarchy(Object.keys(entryGraphColors)).convert(
                            // --- Render for internal nodes (categories that have child categories) ---
                            (
                                value: string,
                                children: ReactNode,
                                childValues: string[],
                            ) => {
                                const path =
                                    childValues.length > 0 &&
                                    childValues[0].includes('/')
                                        ? childValues[0].substring(
                                              0,
                                              childValues[0].lastIndexOf('/') + 1,
                                          )
                                        : '';

                                const leafNodes = childValues.filter(
                                    (cv) =>
                                        entryGraphColors[cv] &&
                                        !childValues.some(
                                            (other) =>
                                                other !== cv && cv.startsWith(other),
                                        ),
                                );

                                const allDisabled = leafNodes.every((node) =>
                                    disabledTypes.has(node),
                                );

                                return (
                                    <div className='mt-1.5 w-full relative' key={value}>
                                        <div className='absolute left-1 top-1.5 bottom-0 w-px bg-border-border' />
                                        <div className='pl-4'>
                                            <Collapsible>
                                                <div className='flex justify-between items-center'>
                                                    <CollapsibleTrigger asChild>
                                                        <Button
                                                            variant='ghost'
                                                            size='sm'
                                                            className='group hover:text-border-primary'
                                                        >
                                                            <NavArrowRight className='w-4 h-4 group-data-[state=open]:hidden' />
                                                            <NavArrowDown className='w-4 h-4 hidden group-data-[state=open]:block' />
                                                            <span>{value}</span>
                                                        </Button>
                                                    </CollapsibleTrigger>
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        className='text-xs px-2 py-1 hover:bg-bg-card'
                                                        onClick={() =>
                                                            toggleAllAtPath(
                                                                path,
                                                                leafNodes.map((ln) =>
                                                                    ln.substring(
                                                                        path.length,
                                                                    ),
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        {allDisabled ? 'Show' : 'Hide'}
                                                    </Button>
                                                </div>
                                                <CollapsibleContent>
                                                    <div className='flex flex-wrap gap-1 mt-4'>
                                                        {children}
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>
                                        </div>
                                    </div>
                                );
                            },
                            // --- Render for leaf nodes ---
                            (value: string, path: string) => {
                                const fullSubtype = path + value;
                                return (
                                    <div
                                        key={fullSubtype}
                                        className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded cursor-pointer transition-all text-xs ${
                                            disabledTypes.has(fullSubtype)
                                                ? 'opacity-50 line-through'
                                                : 'hover:bg-bg-card'
                                        }`}
                                        onClick={() => toggleDisabledType(fullSubtype)}
                                    >
                                        <div
                                            className='w-2 h-2 rounded-full flex-shrink-0'
                                            style={{
                                                backgroundColor:
                                                    entryGraphColors[fullSubtype],
                                            }}
                                        />
                                        <span className='truncate'>{value}</span>
                                    </div>
                                );
                            },
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
};

export default GraphLegend;
