import React, { forwardRef, useState, useRef } from 'react';
import { Formik, Form, Field } from 'formik';
import Datepicker from 'react-tailwindcss-datepicker';
import * as Yup from 'yup';
import { Search, PlaySolid, PauseSolid } from 'iconoir-react';
import Selector from '../Selector/Selector';
import { format, parseISO } from 'date-fns';
import { fetchGraph } from '../../services/graphService/graphService';
import { advancedQuery } from '../../services/queryService/queryService';
import {
    LinkTreeFlattener,
    truncateText,
} from '../../utils/dashboardUtils/dashboardUtils';
import AlertBox from '../AlertBox/AlertBox';

// Validation schema for the search form.
const GraphQuerySchema = Yup.object().shape({
    operation: Yup.string().required('Operation is required'),
    src: Yup.string().required('Start node is required'),
    dst: Yup.array().min(1, 'At least one destination is required'),
    max_depth: Yup.number()
        .required('Max depth is required')
        .min(1, 'Max depth must be at least 1')
        .max(3, 'Max depth cannot exceed 3'),
    startDate: Yup.date().required('Start date is required'),
    endDate: Yup.date()
        .required('End date is required')
        .min(Yup.ref('startDate'), 'End date must be after or equal to start date'),
});

// GraphSearch is wrapped in forwardRef so that it can use the shared graphRef.
const GraphSearch = forwardRef(
    ({ initialValues, processNewNode, addEdge }, graphRef) => {
        // Local state for managing the form fields.
        const [startEntry, setStartEntry] = useState(
            initialValues.src
                ? { value: initialValues.src, label: initialValues.src }
                : null,
        );
        const [destinationSelectors, setDestinationSelectors] = useState(
            initialValues.dst.map((d) => ({ value: d, label: d })) || [],
        );
        const [isGraphFetching, setIsGraphFetching] = useState(false);
        const [loading, setLoading] = useState(false);
        const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
        const fetchingCancelled = useRef(false);

        const fetchEntries = async (q) => {
            const results = await advancedQuery(q, true);
            if (results.status === 200) {
                return results.data.results.map((alias) => ({
                    value: alias.id,
                    label: `${alias.subtype}:${alias.name}`,
                }));
            } else {
                displayError(setAlert, navigate)(results);
                return [];
            }
        };

        const handleSubmit = async (values, { setSubmitting }) => {
            setSubmitting(false);
        };

        const fetchGraphData = async (initialPage = 1) => {
            setLoading(true);
            setIsGraphFetching(true);
            let page = initialPage;
            let hasNext = true;
            try {
                while (hasNext) {
                    if (fetchingCancelled.current) break;
                    const response = await fetchGraph(page);
                    const has_next = response.data.has_next;
                    const { entries, relations, colors } = response.data.results;
                    const flattenedEntries = LinkTreeFlattener.flatten(entries);
                    let nodeChanges = [];
                    // Process each entry; if it's new, add it and update stats.
                    for (let e of flattenedEntries) {
                        if (!graphRef.current.hasElementWithId(e.id)) {
                            e.label = truncateText(
                                `${e.subtype}: ${e.name || e.id}`,
                                25,
                            );
                            e.color = colors[e.subtype];
                            const node = {
                                group: 'nodes',
                                data: {
                                    ...e,
                                    originalX: e.location[0],
                                    originalY: e.location[1],
                                },
                                position: { x: e.location[0], y: e.location[1] },
                            };
                            nodeChanges.push(node);
                            processNewNode(e);
                        }
                    }
                    graphRef.current.add(nodeChanges);
                    graphRef.current.layout({ name: 'preset' });
                    let edgeChanges = [];
                    for (let relation of relations) {
                        if (!graphRef.current.hasElementWithId(relation.id)) {
                            const link = {
                                group: 'edges',
                                data: {
                                    source: relation.src,
                                    target: relation.dst,
                                    created_at: relation.created_at,
                                    last_seen: relation.last_seen,
                                    id: relation.id,
                                },
                            };
                            edgeChanges.push(link);
                        }
                    }
                    graphRef.current.add(edgeChanges);
                    graphRef.current.layout({ name: 'preset', animate: false });
                    addEdge(edgeChanges.length);
                    hasNext = has_next;
                    page++;
                    if (fetchingCancelled.current) break;
                }
            } catch (error) {
                setAlert({
                    show: true,
                    message: error.message,
                    color: 'red',
                });
            } finally {
                setLoading(false);
                setIsGraphFetching(false);
                graphRef.current.fit(graphRef.current.elements(), 100);
            }
        };

        const handleToggleFetching = () => {
            if (isGraphFetching) {
                fetchingCancelled.current = true;
            } else {
                fetchingCancelled.current = false;
                fetchGraphData();
            }
        };

        return (
            <Formik
                initialValues={initialValues}
                validationSchema={GraphQuerySchema}
                onSubmit={handleSubmit}
                enableReinitialize
            >
                {({ isSubmitting, setFieldValue, errors, touched, values }) => (
                    <Form className='flex flex-col space-y-2 px-2'>
                        <div className='grid grid-cols-12 gap-2'>
                            <div className='col-span-5 flex flex-col'>
                                <label className='text-xs text-gray-400 mb-1'>
                                    Start Node
                                </label>
                                <Selector
                                    value={startEntry}
                                    onChange={(selected) => {
                                        setStartEntry(selected);
                                        setFieldValue('src', selected?.value || '');
                                    }}
                                    fetchOptions={fetchEntries}
                                    isMulti={false}
                                    placeholder='Entry to start from'
                                    className='text-sm'
                                />
                                {errors.src && touched.src && (
                                    <div className='text-red-500 text-xs mt-1'>
                                        {errors.src}
                                    </div>
                                )}
                            </div>
                            <div className='col-span-2 flex flex-col'>
                                <label className='text-xs text-gray-400 mb-1'>
                                    Max Depth
                                </label>
                                <Field
                                    type='number'
                                    name='max_depth'
                                    className='input py-1 px-2 text-sm'
                                    min='1'
                                    max='3'
                                />
                                {errors.max_depth && touched.max_depth && (
                                    <div className='text-red-500 text-xs mt-1'>
                                        {errors.max_depth}
                                    </div>
                                )}
                            </div>
                            <div className='col-span-5 flex flex-col'>
                                <label className='text-xs text-gray-400 mb-1'>
                                    Select Destinations
                                </label>
                                <Selector
                                    value={destinationSelectors}
                                    onChange={(selected) => {
                                        setDestinationSelectors(selected || []);
                                        setFieldValue(
                                            'dst',
                                            (selected || []).map((s) => s.value),
                                        );
                                    }}
                                    fetchOptions={fetchEntries}
                                    isMulti={true}
                                    placeholder='Multiple destinations'
                                    className='text-sm'
                                />
                                {errors.dst && touched.dst && (
                                    <div className='text-red-500 text-xs mt-1'>
                                        {errors.dst}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className='flex flex-row space-x-2 items-center w-full mt-4'>
                            <div className='flex flex-col !max-w-full w-full'>
                                <label className='text-xs text-gray-400 mb-1'>
                                    Date Range
                                </label>
                                <Datepicker
                                    value={{
                                        startDate: parseISO(values.startDate),
                                        endDate: parseISO(values.endDate),
                                    }}
                                    onChange={(value) => {
                                        if (value.startDate && value.endDate) {
                                            setFieldValue(
                                                'startDate',
                                                format(value.startDate, 'yyyy-MM-dd'),
                                            );
                                            setFieldValue(
                                                'endDate',
                                                format(value.endDate, 'yyyy-MM-dd'),
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
                                className='btn w-fit flex items-center mt-auto tooltip tooltip-bottom'
                                data-tooltip='Find paths between the specified nodes'
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
                            <button
                                type='button'
                                onClick={handleToggleFetching}
                                className='btn w-fit flex items-center mt-auto tooltip tooltip-bottom'
                                data-tooltip='Fetch graph data'
                            >
                                {isGraphFetching ? (
                                    <>
                                        <PauseSolid className='text-primary mr-2' />{' '}
                                        Stop
                                    </>
                                ) : (
                                    <>
                                        <PlaySolid className='text-primary mr-2' />{' '}
                                        Fetch
                                    </>
                                )}
                            </button>
                        </div>
                        <AlertBox alert={alert} />
                    </Form>
                )}
            </Formik>
        );
    },
);

export default GraphSearch;
