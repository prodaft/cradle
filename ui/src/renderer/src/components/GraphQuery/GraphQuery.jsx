import React, { useCallback, useEffect, useState } from 'react';
import 'tailwindcss/tailwind.css';
import { getGraphData, queryGraph } from '../../services/graphService/graphService';
import { Menu, RefreshDouble, Search } from 'iconoir-react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { flattenGraphEntries, preprocessData } from '../../utils/graphUtils/graphUtils';
import Graph from '../Graph/Graph';
import {
    LinkTreeFlattener,
    truncateText,
} from '../../utils/dashboardUtils/dashboardUtils';
import Editor from '../Editor/Editor';
import { ForceGraph2D } from 'react-force-graph';
import NotesList from '../NotesList/NotesList';
import Selector from '../Selector/Selector';
import { advancedQuery } from '../../services/queryService/queryService';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { format, parseISO } from 'date-fns';
import Datepicker from 'react-tailwindcss-datepicker';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

// Define Yup validation schema
const GraphQuerySchema = Yup.object().shape({
    operation: Yup.string().required('Operation is required'),
    src: Yup.string().required('Start node is required'),
    dst: Yup.string().required('Destination is required'),
    min_depth: Yup.number()
        .required('Minimum depth is required')
        .positive('Must be positive')
        .integer('Must be an integer')
        .min(1, 'Minimum depth must be at least 1'),
    max_depth: Yup.number()
        .required('Maximum depth is required')
        .positive('Must be positive')
        .integer('Must be an integer')
        .max(3, 'Maximum depth cannot exceed 3')
        .test(
            'min-max',
            'Maximum depth must be greater than or equal to minimum depth',
            function (value) {
                return value >= this.parent.min_depth;
            },
        ),
    edges_per_node: Yup.number()
        .required('Edges per node is required')
        .positive('Must be positive')
        .integer('Must be an integer')
        .min(1, 'Must have at least 1 edge per node')
        .max(10, 'Cannot exceed 10 edges per node'),
    matchType: Yup.string()
        .required('Match type is required')
        .oneOf(['type', 'entry'], 'Invalid match type'),
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
    setHighlightedLinks,
    setHighlightedNodes,
    setAlert,
    notesQuery,
}) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    // Initialize form values from search params
    const initialValues = {
        operation: searchParams.get('operation') || 'pathfind',
        src: searchParams.get('src') || '',
        dst: searchParams.get('dst') || '',
        min_depth: parseInt(searchParams.get('min_depth')) || 1,
        max_depth: parseInt(searchParams.get('max_depth')) || 2,
        edges_per_node: parseInt(searchParams.get('edges_per_node')) || 5,
        startDate: searchParams.get('startDate') || format(new Date(), 'yyyy-MM-dd'),
        endDate: searchParams.get('endDate') || format(new Date(), 'yyyy-MM-dd'),
        matchType: searchParams.get('matchType') || 'type',
    };

    // For Selector components state
    const [startEntry, setStartEntry] = useState(null);
    const [destinationSelector, setDestinationSelector] = useState(null);
    const [matchDestination, setMatchDestination] = useState(initialValues.matchType);

    // Date range state
    const [dateRange, setDateRange] = useState([
        {
            startDate: parseISO(initialValues.startDate),
            endDate: parseISO(initialValues.endDate),
            key: 'selection',
        },
    ]);

    const parseEntry = (entry) => {
        return { query: entry };
    };

    const fetchAliases = async (q) => {
        const results = await advancedQuery(q, true);

        if (results.status === 200) {
            let a = results.data.results.map((alias) => ({
                value: alias.id,
                label: `${alias.subtype}:${alias.name}`,
            }));
            return a;
        } else {
            displayError(setAlert, navigate)(results);
            return [];
        }
    };

    // Handle date range change
    const handleDateRangeChange = (range, setFieldValue) => {
        if (range.startDate && range.endDate) {
            setDateRange([
                {
                    startDate: range.startDate,
                    endDate: range.endDate,
                    key: 'selection',
                },
            ]);
            setFieldValue('startDate', format(range.startDate, 'yyyy-MM-dd'));
            setFieldValue('endDate', format(range.endDate, 'yyyy-MM-dd'));
        }
    };

    // Update source and destination in Formik when selectors change
    useEffect(() => {
        if (startEntry) {
            // This will be used by Formik's setFieldValue
        }
    }, [startEntry]);

    useEffect(() => {
        if (destinationSelector) {
            // This will be used by Formik's setFieldValue
        }
    }, [destinationSelector]);

    // Handle form submission
    const handleSubmit = async (values, { setSubmitting }) => {
        setLoading(true);
        setSubmitting(true);

        try {
            // Update URL search params
            const params = new URLSearchParams();
            Object.entries(values).forEach(([key, value]) => {
                params.set(key, value);
            });
            setSearchParams(params);

            // Deep-copy query object
            let parsedQuery = {
                operation: values.operation,
                params: {
                    src: parseEntry(values.src),
                    dst: parseEntry(values.dst),
                    min_depth: values.min_depth,
                    max_depth: values.max_depth,
                    edges_per_node: values.edges_per_node,
                    startDate: values.startDate,
                    endDate: values.endDate,
                    matchType: values.matchType,
                },
                result_type: 'vertices',
            };

            let response = await queryGraph(parsedQuery);
            let allColors = response.data.colors;
            let changes = { links: [], nodes: [] };

            let links = [];
            let nodes = [];
            let colors = {};

            let entries = flattenGraphEntries(response.data.entries);
            let source = response.data.source;

            if (!cache.nodesSet.has(source.id)) {
                cache.nodesSet.add(source.id);
                source.color =
                    source.subtype in allColors ? allColors[source.subtype] : '#888888';
                source.label = truncateText(
                    `${source.subtype}: ${source.name ? source.name : source.id}`,
                    40,
                );
                changes.nodes.push(source);
                cache.nodes[source.id] = source;
                colors[source.subtype] = source.color;
            }

            for (let e of entries) {
                if (!cache.nodesSet.has(e.id)) {
                    cache.nodesSet.add(e.id);
                    e.color = e.subtype in allColors ? allColors[e.subtype] : '#888888';
                    e.label = truncateText(
                        `${e.subtype}: ${e.name ? e.name : e.id}`,
                        40,
                    );
                    changes.nodes.push(e);
                    cache.nodes[e.id] = e;
                    colors[e.subtype] = e.color;
                }
                nodes.push(e.id);
            }

            parsedQuery.result_type = 'paths';
            response = await queryGraph(parsedQuery);
            let paths = response.data.paths;

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
                    if (!cache.nodesSet.has(e)) {
                        cache.nodesSet.add(e);
                        changes.nodes.push({
                            id: e,
                            color: '#888888',
                            label: truncateText(`unknown: ${e}`, 40),
                        });
                        cache.nodes[e] = changes.nodes[changes.nodes.length - 1];
                        nodes.push(e);
                    }
                    links.push(link);
                    e = p[i];
                }
                if (!cache.nodesSet.has(e)) {
                    cache.nodesSet.add(e);
                    changes.nodes.push({
                        id: e,
                        color: '#888888',
                        label: truncateText(`unknown: ${e}`, 40),
                    });
                    cache.nodes[e] = changes.nodes[changes.nodes.length - 1];
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
            if (values.operation === 'pathfind') {
                setHighlightedLinks(new Set(links));
                setHighlightedNodes(new Set(nodes));
            }
        } catch (error) {
            displayError(setAlert, navigate)(error);
        } finally {
            setLoading(false);
            setSubmitting(false);
        }
    };

    return (
        <>
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
                                <div className='grid grid-cols-2 gap-2'>
                                    <div className='flex flex-col'>
                                        <label className='text-xs text-gray-600 mb-1'>
                                            Start Node
                                        </label>
                                        <Selector
                                            value={startEntry}
                                            onChange={(selected) => {
                                                setStartEntry(selected);
                                                setFieldValue(
                                                    'src',
                                                    selected?.value || '',
                                                );
                                            }}
                                            fetchOptions={fetchAliases}
                                            isMulti={false}
                                            placeholder='Select a single entry to start from'
                                            className='text-sm'
                                        />
                                        {errors.src && touched.src && (
                                            <div className='text-red-500 text-xs mt-1'>
                                                {errors.src}
                                            </div>
                                        )}
                                    </div>
                                    <div className='flex flex-col'>
                                        <label className='text-xs text-gray-600 mb-1'>
                                            Select Destination {values.matchType}
                                        </label>
                                        <Selector
                                            value={destinationSelector}
                                            onChange={(selected) => {
                                                setDestinationSelector(selected);
                                                setFieldValue(
                                                    'dst',
                                                    selected?.value || '',
                                                );
                                            }}
                                            fetchOptions={fetchAliases}
                                            isMulti={false}
                                            placeholder={`Select ${values.matchType}`}
                                            className='text-sm'
                                        />
                                        {errors.dst && touched.dst && (
                                            <div className='text-red-500 text-xs mt-1'>
                                                {errors.dst}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Parameters row */}
                                <div className='grid grid-cols-4 gap-2'>
                                    <div className='flex flex-col'>
                                        <label className='text-xs text-gray-600 mb-1'>
                                            Match Technique
                                        </label>
                                        <Field
                                            as='select'
                                            name='matchType'
                                            className='input py-1 px-2 text-sm'
                                            onChange={(e) => {
                                                setMatchDestination(e.target.value);
                                                setFieldValue(
                                                    'matchType',
                                                    e.target.value,
                                                );
                                            }}
                                        >
                                            <option value='type'>Type</option>
                                            <option value='entry'>Entry</option>
                                        </Field>
                                        {errors.matchType && touched.matchType && (
                                            <div className='text-red-500 text-xs mt-1'>
                                                {errors.matchType}
                                            </div>
                                        )}
                                    </div>

                                    <div className='flex flex-col'>
                                        <label className='text-xs text-gray-600 mb-1'>
                                            Min Depth
                                        </label>
                                        <Field
                                            type='number'
                                            name='min_depth'
                                            min={1}
                                            className='input py-1 px-2 text-sm'
                                        />
                                        {errors.min_depth && touched.min_depth && (
                                            <div className='text-red-500 text-xs mt-1'>
                                                {errors.min_depth}
                                            </div>
                                        )}
                                    </div>

                                    <div className='flex flex-col'>
                                        <label className='text-xs text-gray-600 mb-1'>
                                            Max Depth
                                        </label>
                                        <Field
                                            type='number'
                                            name='max_depth'
                                            min={values.min_depth}
                                            max={3}
                                            className='input py-1 px-2 text-sm'
                                        />
                                        {errors.max_depth && touched.max_depth && (
                                            <div className='text-red-500 text-xs mt-1'>
                                                {errors.max_depth}
                                            </div>
                                        )}
                                    </div>

                                    <div className='flex flex-col'>
                                        <label className='text-xs text-gray-600 mb-1'>
                                            Edges per Node
                                        </label>
                                        <Field
                                            type='number'
                                            name='edges_per_node'
                                            min={1}
                                            max={10}
                                            className='input py-1 px-2 text-sm'
                                        />
                                        {errors.edges_per_node &&
                                            touched.edges_per_node && (
                                                <div className='text-red-500 text-xs mt-1'>
                                                    {errors.edges_per_node}
                                                </div>
                                            )}
                                    </div>
                                </div>

                                {/* Date picker and submit button */}
                                <div className='grid grid-cols-2 gap-2'>
                                    <div className='flex flex-col'>
                                        <label className='text-xs text-gray-600 mb-1'>
                                            Date Range
                                        </label>
                                        <Datepicker
                                            value={{
                                                startDate: parseISO(values.startDate),
                                                endDate: parseISO(values.endDate),
                                            }}
                                            onChange={(value) =>
                                                handleDateRangeChange(
                                                    value,
                                                    setFieldValue,
                                                )
                                            }
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
        </>
    );
}
