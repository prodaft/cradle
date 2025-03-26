import React, { useState } from 'react';
import 'tailwindcss/tailwind.css';
import { graphPathFind } from '../../services/graphService/graphService';
import { Search } from 'iconoir-react';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { truncateText } from '../../utils/dashboardUtils/dashboardUtils';
import NotesList from '../NotesList/NotesList';
import Selector from '../Selector/Selector';
import { advancedQuery } from '../../services/queryService/queryService';
import { format, parseISO, addDays } from 'date-fns';
import Datepicker from 'react-tailwindcss-datepicker';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

// Updated Yup validation schema to include max_depth
const GraphQuerySchema = Yup.object().shape({
    operation: Yup.string().required('Operation is required'),
    src: Yup.string().required('Start node is required'),
    dst: Yup.array().min(1, 'At least one destination is required'),
    max_depth: Yup.number()
        .required('Max depth is required')
        .min(1, 'Max depth must be at least 1')
        .max(3, 'Max depth cannot exceed 10'),
    startDate: Yup.date().required('Start date is required'),
    endDate: Yup.date()
        .required('End date is required')
        .min(Yup.ref('startDate'), 'End date must be after or equal to start date'),
});

export default function GraphQuery({
    graphData,
    setGraphData,
    setEntryColors,
    cache,
    setCache,
    setHighlightedNodes,
    setAlert,
    notesQuery,
}) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);

    // Initialize startEntry state with initial value from src search param if exists
    const [startEntry, setStartEntry] = useState(
        searchParams.get('src')
            ? { value: searchParams.get('src'), label: searchParams.get('src') }
            : null,
    );

    // Updated initial values with max_depth and extended date range
    const initialValues = {
        operation: searchParams.get('operation') || 'pathfind',
        src: searchParams.get('src') || '',
        dst: JSON.parse(searchParams.get('dst') || '[]'),
        max_depth: parseInt(searchParams.get('max_depth') || '2'),
        startDate: searchParams.get('startDate') || '1970-01-01', // Beginning of Unix epoch
        endDate:
            searchParams.get('endDate') || format(addDays(new Date(), 1), 'yyyy-MM-dd'), // Tomorrow
    };

    // For Selector components state
    const [destinationSelectors, setDestinationSelectors] = useState(
        initialValues.dst.map((d) => ({ value: d, label: d })) || [],
    );

    const fetchAliases = async (q) => {
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

    // Handle form submission
    const handleSubmit = async (values, { setSubmitting }) => {
        setLoading(true);
        setSubmitting(true);

        try {
            // Update URL search params
            const params = new URLSearchParams();
            Object.entries(values).forEach(([key, value]) => {
                params.set(key, key === 'dst' ? JSON.stringify(value) : value);
            });
            setSearchParams(params, { replace: true });

            // Build the query matching the serializer's expected keys
            const parsedQuery = {
                src: values.src,
                dsts: values.dst,
                max_depth: values.max_depth,
                min_date: values.startDate,
                max_date: values.endDate,
            };

            const response = await graphPathFind(parsedQuery);
            const paths = response.data.paths;
            const changes = { links: [], nodes: [] };
            let colors = {};

            const entries = response.data.entries;
            for (let e of entries) {
                if (!cache.nodesSet.has(e.id)) {
                    cache.nodesSet.add(e.id);
                    e.label = truncateText(`${e.subtype}: ${e.name || e.id}`, 40);
                    changes.nodes.push(e);
                    cache.nodes[e.id] = e;
                    colors[e.subtype] = e.color;
                }
            }

            for (let p of paths) {
                let e = p[0];
                for (let i = 1; i < p.length; i++) {
                    let link = { source: e, target: p[i] };
                    if (!cache.linksSet.has(e + p[i])) {
                        changes.links.push(link);
                        cache.linksSet.add(e + p[i]);
                        cache.links[e + p[i]] = link;
                    } else {
                        link = cache.links[e + p[i]];
                    }
                    e = p[i];
                }
                if (!cache.nodesSet.has(e)) {
                    cache.nodesSet.add(e);
                    const unknownNode = {
                        id: e,
                        color: '#888888',
                        label: truncateText(`unknown: ${e}`, 40),
                    };
                    changes.nodes.push(unknownNode);
                    cache.nodes[e] = unknownNode;
                }
            }
            // Replace source and destination from ids to objects in links
            for (let link of changes.links) {
                link.source = cache.nodes[link.source];
                link.target = cache.nodes[link.target];
            }

            setGraphData((prev) => ({
                nodes: [...prev.nodes, ...changes.nodes],
                links: [...prev.links, ...changes.links],
            }));
            setCache(cache);
            setEntryColors((prev) => ({ ...prev, ...colors }));
            setHighlightedNodes(new Set([...values.dst, values.src]));
        } catch (error) {
            displayError(setAlert, navigate)(error);
        } finally {
            setLoading(false);
            setSubmitting(false);
        }
    };

    return (
        <div className='h-full p-3 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex flex-col'>
            <div className='flex flex-col flex-1 overflow-hidden'>
                <Formik
                    initialValues={initialValues}
                    validationSchema={GraphQuerySchema}
                    onSubmit={handleSubmit}
                    enableReinitialize
                >
                    {({ isSubmitting, setFieldValue, errors, touched, values }) => (
                        <Form className='flex flex-col space-y-2 px-2'>
                            {/* Start and Destination selectors */}
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
                                        fetchOptions={fetchAliases}
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
                                        fetchOptions={fetchAliases}
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

                            {/* Date picker and submit button */}
                            <div className='grid grid-cols-2 gap-2'>
                                <div className='flex flex-col'>
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
                                        inputClassName='input py-1 px-2 text-sm'
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
                                    className='btn flex items-center mt-auto'
                                    disabled={isSubmitting || loading}
                                >
                                    {isSubmitting || loading ? (
                                        <div className='spinner-dot-pulse'>
                                            <div className='spinner-pulse-dot'></div>
                                        </div>
                                    ) : (
                                        <>
                                            <Search className='mr-2' /> Search
                                        </>
                                    )}
                                </button>
                            </div>
                        </Form>
                    )}
                </Formik>
                <div className='flex-1 overflow-y-auto mt-2'>
                    {notesQuery && <NotesList query={notesQuery} />}
                </div>
            </div>
        </div>
    );
}
