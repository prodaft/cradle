import { SubtypeHierarchy } from '@/utils/dashboard';
import Collapsible from '@components/base/Collapsible/Collapsible';
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
            <Collapsible
                label='Legend'
                open={true}
                buttonText={allItemsDisabled ? 'Show All' : 'Hide All'}
                onButtonClick={toggleAll}
            >
                <div className='flex flex-wrap gap-1'>
                    {new SubtypeHierarchy(Object.keys(entryGraphColors)).convert(
                        // --- Render for internal nodes (categories that have child categories) ---
                        (value: string, children: ReactNode, childValues: string[]) => {
                            const path =
                                childValues.length > 0 && childValues[0].includes('/')
                                    ? childValues[0].substring(
                                          0,
                                          childValues[0].lastIndexOf('/') + 1,
                                      )
                                    : '';

                            const leafNodes = childValues.filter(
                                (cv) =>
                                    entryGraphColors[cv] &&
                                    !childValues.some(
                                        (other) => other !== cv && cv.startsWith(other),
                                    ),
                            );

                            const allDisabled = leafNodes.every((node) =>
                                disabledTypes.has(node),
                            );

                            return (
                                <div className='mt-1.5 w-full relative' key={value}>
                                    <div className='absolute left-1 top-1.5 bottom-0 w-px bg-cradle-border-accent' />
                                    <div className='pl-4'>
                                        <Collapsible
                                            label={value}
                                            buttonText={allDisabled ? 'Show' : 'Hide'}
                                            onButtonClick={() =>
                                                toggleAllAtPath(
                                                    path,
                                                    leafNodes.map((ln) =>
                                                        ln.substring(path.length),
                                                    ),
                                                )
                                            }
                                        >
                                            <div className='flex flex-wrap gap-1'>
                                                {children}
                                            </div>
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
                                            : 'hover:bg-cradle-bg-elevated'
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
            </Collapsible>
        </div>
    );
};

export default GraphLegend;
