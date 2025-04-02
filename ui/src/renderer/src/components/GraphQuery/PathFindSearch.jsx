import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Datepicker from 'react-tailwindcss-datepicker';
import * as Yup from 'yup';
import { Search } from 'iconoir-react';
import Selector from '../Selector/Selector';
import { format, parseISO } from 'date-fns';
import { advancedQuery } from '../../services/queryService/queryService';
import { graphPathFind } from '../../services/graphService/graphService';
import AlertBox from '../AlertBox/AlertBox';
import { LinkTreeFlattener, truncateText } from '../../utils/dashboardUtils/dashboardUtils';

// Validation schema for the search form.
const GraphQuerySchema = Yup.object().shape({
    src: Yup.string().required('Start node is required'),
    dst: Yup.array().min(1, 'At least one destination is required'),
    startDate: Yup.date().required('Start date is required'),
    endDate: Yup.date()
        .required('End date is required')
        .min(Yup.ref('startDate'), 'End date must be after or equal to start date'),
});

const PathFindSearch = forwardRef(
    ({ initialValues, processNewNode, addEdge }, graphRef) => {
        // Get search params hook from react-router-dom.
        const [searchParams, setSearchParams] = useSearchParams();

        // Form state
        const [formValues, setFormValues] = useState(initialValues);
        const [errors, setErrors] = useState({});
        const [touched, setTouched] = useState({});
        const [isSubmitting, setIsSubmitting] = useState(false);

        // UI state
        const [startEntry, setStartEntry] = useState(
            initialValues.src
                ? { value: initialValues.src, label: initialValues.src }
                : null,
        );
        const [destinationSelectors, setDestinationSelectors] = useState(
            initialValues.dst.map((d) => ({ value: d, label: d })) || [],
        );
        const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

        // Reset form when initialValues change
        useEffect(() => {
            setFormValues(initialValues);
            setStartEntry(
                initialValues.src
                    ? { value: initialValues.src, label: initialValues.src }
                    : null,
            );
            setDestinationSelectors(
                initialValues.dst.map((d) => ({ value: d, label: d })) || [],
            );
        }, [initialValues]);

        const fetchEntries = async (q) => {
            const results = await advancedQuery(q, true);
            if (results.status === 200) {
                return results.data.results.map((alias) => ({
                    value: alias.id,
                    label: `${alias.subtype}:${alias.name}`,
                }));
            } else {
                displayError(setAlert)(results);
                return [];
            }
        };

        const handleInputChange = (e) => {
            const { name, value } = e.target;
            setFormValues((prev) => ({ ...prev, [name]: value }));
            setTouched((prev) => ({ ...prev, [name]: true }));
        };

        const setFieldValue = (name, value) => {
            setFormValues((prev) => ({ ...prev, [name]: value }));
            setTouched((prev) => ({ ...prev, [name]: true }));
        };

        const validateForm = async () => {
            try {
                await GraphQuerySchema.validate(formValues, { abortEarly: false });
                setErrors({});
                return true;
            } catch (validationErrors) {
                const newErrors = {};
                validationErrors.inner.forEach((error) => {
                    newErrors[error.path] = error.message;
                });
                console.log(newErrors);
                setErrors(newErrors);
                return false;
            }
        };

        const handleSubmit = async (e) => {
            e.preventDefault();

            // Mark all fields as touched on submit
            const allTouched = Object.keys(formValues).reduce((acc, key) => {
                acc[key] = true;
                return acc;
            }, {});
            setTouched(allTouched);

            const isValid = await validateForm();
            if (isValid) {
                // Update query parameters with current form values.
                setSearchParams({
                    src: formValues.src,
                    dst: JSON.stringify(formValues.dst),
                    startDate: formValues.startDate,
                    endDate: formValues.endDate,
                });
                setIsSubmitting(true);
                try {
                    const response = await graphPathFind({
                        src: formValues.src,
                        dsts: formValues.dst,
                        min_date: formValues.startDate,
                        max_date: formValues.endDate,
                    });

                    const { entries, relations, colors } = response.data;

                    const flattenedEntries = LinkTreeFlattener.flatten(entries);
                    let changes = [];

                    // Process each entry; if it's new, add it and update stats
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
                            changes.push(node);
                            processNewNode(e);
                        }
                    }

                    let edgeCount = 0;
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
                            changes.push(link);
                            edgeCount += 1;
                        }
                    }

                    graphRef.current.add(changes);
                    graphRef.current.layout({ name: 'preset', animate: true });
                    addEdge(edgeCount);
                    graphRef.current.fit(graphRef.current.elements(), 100);
                    setAlert({show:false});
                } catch (error) {
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

        // Field validation helper
        const showError = (fieldName) => {
            return errors[fieldName] && touched[fieldName] ? (
                <div className='text-red-500 text-xs mt-1'>{errors[fieldName]}</div>
            ) : null;
        };

        // Function to display errors from API calls
        const displayError = (setAlert) => (results) => {
            setAlert({
                show: true,
                message: results.error || 'An error occurred',
                color: 'red',
            });
        };

        return (
            <div className='flex flex-col space-y-4'>
                <form className='flex flex-col space-y-2 px-2' onSubmit={handleSubmit}>
                    <div className='grid grid-cols-12 gap-2'>
                        <div className='col-span-6 flex flex-col'>
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
                                onChange={(selected) => {
                                    setDestinationSelectors(selected || []);
                                    setFieldValue(
                                        'dst',
                                        (selected || []).map((s) => s.value),
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
                            <label className='text-xs text-gray-400 mb-1'>
                                Date Range
                            </label>
                            <Datepicker
                                value={{
                                    startDate: parseISO(formValues.startDate),
                                    endDate: parseISO(formValues.endDate),
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
                    </div>
                </form>
                <AlertBox alert={alert} />
            </div>
        );
    },
);

export default PathFindSearch;
