import useApi from '@/hooks/api/useApi';
import { EdgeRelation } from '@/services/cradle';
import {
    LinkTreeFlattener,
    truncateText,
} from '@/utils/dashboard';
import AlertBox from '@components/base/Alert/AlertBox';
import Selector from '@components/forms/Selector';
import { parseISO } from 'date-fns';
import { Search } from 'iconoir-react';
import { FormEvent, useEffect, useState } from 'react';
import { MultiValue } from 'react-select';
import Datepicker from 'react-tailwindcss-datepicker';
import * as Yup from 'yup';

interface Node {
    id: string;
    degree?: number;
    type?: string;
    label?: string;
    color?: string;
    [key: string]: any;
}

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface SelectorOption {
    value: number;
    id: number;
    degree?: number;
    type?: string;
    label: string;
}

interface FormValues {
    src: number | null;
    dst: number[];
    startDate: Date;
    endDate: Date;
}

interface QueryValues {
    src: SelectorOption | null;
    dst: SelectorOption[];
    max_depth: number;
    startDate: string;
    endDate: string;
}

interface PathFindSearchProps {
    queryValues: QueryValues;
    setQueryValues: (values: any) => void;
    addEdges: (edges: EdgeRelation[]) => void;
    addNodes: (nodes: Node[]) => void;
}

const GraphQuerySchema = Yup.object().shape({
    src: Yup.string().required('Start node is required'),
    dst: Yup.array().min(1, 'At least one destination is required'),
    startDate: Yup.date().required('Start date is required'),
    endDate: Yup.date()
        .required('End date is required')
        .min(Yup.ref('startDate'), 'End date must be after or equal to start date'),
});

export default function PathFindSearch({
    queryValues,
    setQueryValues,
    addEdges,
    addNodes,
}: PathFindSearchProps) {
    const [formValues, setFormValues] = useState<FormValues>({
        src: null,
        dst: [],
        startDate: parseISO(queryValues.startDate),
        endDate: parseISO(queryValues.endDate),
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { queryApi, knowledgeGraphApi } = useApi();

    const [startEntry, setStartEntry] = useState<SelectorOption | null>(queryValues.src || null);
    const [destinationSelectors, setDestinationSelectors] = useState<SelectorOption[]>(
        queryValues.dst || [],
    );
    const [alert, setAlert] = useState<Alert>({ show: false, message: '', color: 'red' });

    useEffect(() => {
        setFormValues({
            src: queryValues.src?.value || null,
            dst: queryValues.dst?.map((d) => d.value) || [],
            startDate: parseISO(queryValues.startDate),
            endDate: parseISO(queryValues.endDate),
        });
        setStartEntry(queryValues.src || null);
        setDestinationSelectors(queryValues.dst || []);
    }, [queryValues]);

    const fetchEntries = async (q: string | string[]) => {
        try {
            const results = await queryApi.queryAdvancedRetrieve({
                query: Array.isArray(q) ? q : [q],
                wildcard: true,
            });
            return results.results.map((alias) => ({
                value: alias.id!,
                id: alias.id!,
                type: alias.subtype,
                label: `${alias.subtype}:${alias.name}`,
            }));
        } catch (error) {
            displayError(setAlert)(error);
            return [];
        }
    };

    const setFieldValue = (name: string, value: any) => {
        setFormValues((prev) => ({ ...prev, [name]: value }));
        setTouched((prev) => ({ ...prev, [name]: true }));
    };

    const validateForm = async () => {
        try {
            await GraphQuerySchema.validate(formValues, { abortEarly: false });
            setErrors({});
            return true;
        } catch (validationErrors: any) {
            const newErrors: Record<string, string> = {};
            validationErrors.inner.forEach((error: any) => {
                newErrors[error.path] = error.message;
            });
            setErrors(newErrors);
            return false;
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const allTouched = Object.keys(formValues).reduce((acc, key) => {
            acc[key] = true;
            return acc;
        }, {} as Record<string, boolean>);
        setTouched(allTouched);

        const isValid = await validateForm();
        if (isValid) {
            // Set new query values in parent
            setQueryValues({
                ...formValues,
                src: startEntry,
                dst: destinationSelectors,
            });

            setIsSubmitting(true);
            try {
                const response = await knowledgeGraphApi.knowledgeGraphPathfindCreate({
                    pathfindQueryRequest: {
                        src: formValues.src!,
                        dsts: formValues.dst,
                        minDate: formValues.startDate,
                        maxDate: formValues.endDate,
                    },
                });

                const { entries, relations, colors } = response;
                const flattenedEntries = LinkTreeFlattener.flatten(entries);

                if (flattenedEntries.length === 0) {
                    setAlert({
                        show: true,
                        message: 'No path found!',
                        color: 'yellow',
                    });
                }

                flattenedEntries.forEach((e: any) => {
                    e.label = truncateText(`${e.subtype}: ${e.name || e.id}`, 25);
                    e.color = colors[e.subtype];
                });
                addNodes(flattenedEntries as unknown as Node[]);
                addEdges(relations);

                setAlert({ show: false, message: '', color: 'red' });
            } catch (error: any) {
                setAlert({
                    show: true,
                    message: error.message,
                    color: 'red',
                });
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const showError = (fieldName: string) =>
        errors[fieldName] && touched[fieldName] ? (
            <div className='text-red-500 text-xs mt-1'>{errors[fieldName]}</div>
        ) : null;

    const displayError = (setAlert: (alert: Alert) => void) => (results: any) => {
        setAlert({
            show: true,
            message: results.error || 'An error occurred',
            color: 'red',
        });
    };

    return (
        <div className='flex flex-col px-2'>
            <form className='flex flex-col space-y-2' onSubmit={handleSubmit}>
                <div className='grid grid-cols-12 gap-2'>
                    <div className='col-span-6 flex flex-col'>
                        <label className='text-xs text-gray-400 mb-1'>Start Node</label>
                        <Selector
                            value={startEntry}
                            onChange={(selected: SelectorOption | null) => {
                                setStartEntry(selected);
                                setFieldValue('src', selected?.value || '');
                            }}
                            fetchOptions={fetchEntries}
                            isMulti={false}
                            placeholder='Start'
                            className='text-sm'
                        />
                        {showError('src')}
                    </div>
                    <div className='col-span-6 flex flex-col'>
                        <label className='text-xs text-gray-400 mb-1'>
                            Select Destinations
                        </label>
                        <Selector
                            value={destinationSelectors}
                            onChange={(selected: MultiValue<SelectorOption>) => {
                                const mutableArray = Array.from(selected);
                                setDestinationSelectors(mutableArray);
                                setFieldValue(
                                    'dst',
                                    mutableArray.map((s) => s.value),
                                );
                            }}
                            fetchOptions={fetchEntries}
                            isMulti={true}
                            placeholder='Destinations'
                            className='text-sm'
                        />
                        {showError('dst')}
                    </div>
                </div>
                <div className='flex flex-row space-x-2 items-center w-full mt-4'>
                    <div className='flex flex-col !max-w-full w-full'>
                        <label className='text-xs text-gray-400 mb-1'>Date Range</label>
                        <Datepicker
                            value={{
                                startDate: formValues.startDate,
                                endDate: formValues.endDate,
                            }}
                            onChange={(value: any) => {
                                if (value.startDate && value.endDate) {
                                    setFieldValue(
                                        'startDate',
                                        value.startDate,
                                    );
                                    setFieldValue(
                                        'endDate',
                                        value.endDate,
                                    );
                                }
                            }}
                            inputClassName='input py-1 px-2 text-sm flex-grow !max-w-full w-full'
                            toggleClassName='hidden'
                        />
                        {(errors.startDate || errors.endDate) &&
                            (touched.startDate || touched.endDate) && (
                                <div className='text-red-500 text-xs mt-1'>
                                    {errors.startDate || errors.endDate}
                                </div>
                            )}
                    </div>
                    <button
                        type='submit'
                        title='Search graph'
                        className='btn w-fit flex items-center mt-auto'
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <div className='spinner-dot-pulse'>
                                <div className='spinner-pulse-dot'></div>
                            </div>
                        ) : (
                            <>
                                <Search className='text-primary mr-2' /> Search
                            </>
                        )}
                    </button>
                </div>
            </form>
            <AlertBox alert={alert} />
        </div>
    );
}
