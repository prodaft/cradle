import { ScrollArea } from '@/components/ui/scroll-area';
import GraphLegend from './GraphLegend';

interface GraphFiltersProps {
    entryGraphColors: Record<string, string>;
    disabledTypes: Set<string>;
    toggleDisabledType: (type: string) => void;
    setDisabledTypes: (
        types: Set<string> | ((prev: Set<string>) => Set<string>),
    ) => void;
}

export default function GraphFilters({
    entryGraphColors,
    disabledTypes,
    toggleDisabledType,
    setDisabledTypes,
}: GraphFiltersProps) {
    return (
        <div className='px-4 pt-3'>
            <ScrollArea className='max-h-[60vh]'>
                <div className='-mx-4'>
                    <GraphLegend
                        entryGraphColors={entryGraphColors}
                        disabledTypes={disabledTypes}
                        toggleDisabledType={toggleDisabledType}
                        setDisabledTypes={setDisabledTypes}
                    />
                </div>
            </ScrollArea>
        </div>
    );
}
