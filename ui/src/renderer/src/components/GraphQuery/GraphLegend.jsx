import { SubtypeHierarchy } from '../../utils/dashboardUtils/dashboardUtils';
import Collapsible from '../Collapsible/Collapsible';

const GraphLegend = ({
    entryGraphColors,
    disabledTypes,
    toggleDisabledType,
    setDisabledTypes,
}) => {
    if (!entryGraphColors || Object.keys(entryGraphColors).length === 0) return null;

    const toggleAllAtPath = (path, items) => {
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
        <div className='flex flex-col md:flex-row justify-start items-start space-y-4 md:space-y-0 md:space-x-4 pt-2 px-2'>
            <div className='w-full'>
                <div className='mb-2'>
                    {/* Use the new parameters on the main Collapsible so it renders the hide/show all button inside its header */}
                    <Collapsible
                        label='Legend'
                        open={true}
                        buttonText={allItemsDisabled ? 'Show All' : 'Hide All'}
                        onButtonClick={toggleAll}
                    >
                        <div className='w-auto flex flex-col'>
                            <div className='flex flex-wrap text-zinc-300'>
                                {new SubtypeHierarchy(
                                    Object.keys(entryGraphColors),
                                ).convert(
                                    // --- Render for internal nodes (categories that have child categories) ---
                                    (value, children, childValues) => {
                                        // Extract the path for this level
                                        const path =
                                            childValues.length > 0 &&
                                                childValues[0].includes('/')
                                                ? childValues[0].substring(
                                                    0,
                                                    childValues[0].lastIndexOf('/') +
                                                    1,
                                                )
                                                : '';

                                        // Get leaf node values for this category
                                        const leafNodes = childValues.filter(
                                            (cv) =>
                                                entryGraphColors[cv] &&
                                                !childValues.some(
                                                    (other) =>
                                                        other !== cv &&
                                                        cv.startsWith(other),
                                                ),
                                        );

                                        // Determine if all items at this level are disabled
                                        const allDisabled = leafNodes.every((node) =>
                                            disabledTypes.has(node),
                                        );

                                        return (
                                            <div
                                                className='mt-1 dark:text-zinc-300 text-xs w-full pt-1'
                                                key={value}
                                            >
                                                {/* Replace the external button with the new props on Collapsible */}
                                                <Collapsible
                                                    label={value}
                                                    buttonText={
                                                        allDisabled
                                                            ? 'Show All'
                                                            : 'Hide All'
                                                    }
                                                    onButtonClick={() =>
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
                                                    <div className='dark:text-zinc-300 text-xs w-full break-all flex flex-row flex-wrap justify-start items-center'>
                                                        {children}
                                                    </div>
                                                </Collapsible>
                                            </div>
                                        );
                                    },
                                    // --- Render for leaf nodes (concrete subtypes that reference actual entries) ---
                                    (value, path) => (
                                        <div
                                            className='dark:text-zinc-300 text-xs w-36 pt-1'
                                            key={value}
                                        >
                                            <div className='dark:text-zinc-300 text-xs w-full break-all flex flex-row flex-wrap justify-start items-center'>
                                                <div
                                                    className={`flex flex-row items-center space-x-2 cursor-pointer ${disabledTypes.has(path + value)
                                                            ? 'opacity-50'
                                                            : ''
                                                        }`}
                                                    onClick={() =>
                                                        toggleDisabledType(path + value)
                                                    }
                                                >
                                                    <div
                                                        className='w-4 h-4 rounded-full'
                                                        style={{
                                                            backgroundColor:
                                                                entryGraphColors[
                                                                path + value
                                                                ],
                                                        }}
                                                    ></div>
                                                    <span
                                                        className={
                                                            disabledTypes.has(
                                                                path + value,
                                                            )
                                                                ? 'line-through'
                                                                : ''
                                                        }
                                                    >
                                                        {value}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>
                    </Collapsible>
                </div>
            </div>
        </div>
    );
};

export default GraphLegend;
