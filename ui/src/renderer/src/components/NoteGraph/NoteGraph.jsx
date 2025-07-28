import { forwardRef, useRef, useState } from 'react';
import 'tailwindcss/tailwind.css';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Graph from '../Graph/Graph';
import GraphQuery from '../GraphQuery/GraphQuery';
import ResizableSplitPane from '../ResizableSplitPane/ResizableSplitPane';

import { ArrowLeft, ArrowRight, PlaySolid } from 'iconoir-react';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { displayError } from '../../utils/responseUtils/responseUtils';

import useApi from '../../hooks/useApi/useApi';
import {
    LinkTreeFlattener,
    truncateText,
} from '../../utils/dashboardUtils/dashboardUtils';
import AlertBox from '../AlertBox/AlertBox';

const NoteGraphSearch = (noteId) => {
    return forwardRef(({ processNewNode, addEdge }, graphRef) => {
        const [isGraphFetching, setIsGraphFetching] = useState(false);
        const [currentPage, setCurrentPage] = useState(1);
        const [pageSize, setPageSize] = useState(100);
        const [totalPages, setTotalPages] = useState(null);
        const [loading, setLoading] = useState(false);
        const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
        const { notesApi } = useApi();
        const { navigate, navigateLink } = useCradleNavigate();

        const fetchGraphPage = async () => {
            setLoading(true);
            setIsGraphFetching(true);

            try {
                const response = await notesApi.notesGraphRetrieve({
                    noteId,
                    page: currentPage,
                    pageSize,
                });

                console.log(response);

                if (totalPages != response.totalPages) {
                    setTotalPages(response.totalPages);
                }
                const { entries, relations, colors } = response.results;
                const hasEntries = entries && entries.length > 0;
                const hasRelations = relations && relations.length > 0;

                // If no data was returned
                if (!hasEntries && !hasRelations) {
                    setAlert({
                        show: true,
                        message: 'No data returned for the current page.',
                        color: 'yellow',
                    });
                    setLoading(false);
                    setIsGraphFetching(false);
                    return;
                }

                const flattenedEntries = LinkTreeFlattener.flatten(entries);
                let changes = [];

                // Process nodes: add new nodes and update their styles
                for (let e of flattenedEntries) {
                    if (!graphRef.current.hasElementWithId(e.id)) {
                        e.label = truncateText(`${e.subtype}: ${e.name || e.id}`, 25);
                        e.color = colors[e.subtype];
                        e.location = e.location || [
                            Math.floor(Math.random() * 50),
                            Math.floor(Math.random() * 50),
                        ];
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

                graphRef.current.add(changes);

                changes = [];
                let edgeCount = 0;
                for (let relation of relations) {
                    // Only add edges if both source and destination nodes are in the graph.
                    if (
                        !graphRef.current.hasElementWithId(relation.src) ||
                        !graphRef.current.hasElementWithId(relation.dst)
                    ) {
                        continue;
                    }
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
                setAlert({ show: false });
                handlePageChange(currentPage + 1);
            } catch (error) {
                console.error(error);
                displayError(setAlert, navigate)(error);
            } finally {
                setLoading(false);
                setIsGraphFetching(false);
            }
        };

        const handlePageSizeChange = (e) => {
            const newSize = parseInt(e.target.value, 10);
            setPageSize(newSize);
        };

        const handlePageChange = (newPage) => {
            if (totalPages != null && newPage >= 1 && newPage <= totalPages) {
                setCurrentPage(newPage);
            }
        };

        const handlePageInputChange = (e) => {
            const value = parseInt(e.target.value, 10);
            if (
                totalPages != null &&
                !isNaN(value) &&
                value >= 1 &&
                value <= totalPages
            ) {
                setCurrentPage(value);
            }
        };

        return (
            <div className='p-2 mt-2 w-full'>
                <div className='flex items-end w-full justify-between gap-4'>
                    <div className='flex items-center gap-4'>
                        <div className='flex flex-col'>
                            <label className='text-xs text-gray-400 mb-1'>
                                Page Size
                            </label>
                            <select
                                value={pageSize}
                                onChange={handlePageSizeChange}
                                className='input py-1 px-2 text-sm w-24'
                                disabled={isGraphFetching}
                            >
                                {[...Array(10).keys()].map((size) => (
                                    <option key={size} value={size * 100 + 100}>
                                        {size * 100 + 100}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className='flex flex-col'>
                            <label className='text-xs text-gray-400 mb-1'>
                                Current Page
                            </label>
                            <div className='flex items-center gap-2'>
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1 || isGraphFetching}
                                    className='btn btn-xs text-primary'
                                >
                                    <ArrowLeft className='w-3 h-3' />
                                </button>
                                <input
                                    type='number'
                                    min='1'
                                    max={totalPages == null ? 1 : totalPages}
                                    value={currentPage}
                                    onChange={handlePageInputChange}
                                    className='input py-1 px-2 text-sm w-16 text-center'
                                    disabled={isGraphFetching}
                                />
                                <span className='text-sm text-gray-500'>
                                    / {totalPages == null ? '?' : totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={
                                        currentPage === totalPages || isGraphFetching
                                    }
                                    className='btn btn-xs text-primary'
                                >
                                    <ArrowRight className='w-3 h-3' />
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type='button'
                        onClick={fetchGraphPage}
                        className='btn btn flex items-center tooltip tooltip-top'
                        data-tooltip='Fetch graph data'
                        disabled={isGraphFetching}
                    >
                        {isGraphFetching ? (
                            <div className='flex justify-center py-1'>
                                <div className='spinner-dot-pulse'>
                                    <div className='spinner-pulse-dot'></div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <PlaySolid className='text-primary mr-1 w-4' />
                                Fetch Page
                            </>
                        )}
                    </button>
                </div>

                <AlertBox alert={alert} />
            </div>
        );
    });
};

export default function NoteGraph({ noteId }) {
    const [data, setData] = useState({ nodes: [], links: [] });
    const [config, setConfig] = useState({
        nodeRadiusCoefficient: 1,
        linkWidthCoefficient: 1,
        labelSizeCoefficient: 8,
        searchValue: '',

        layout: 'preset',
        animateLayout: false,
        showLabels: true,
    });
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [selectedEntries, setSelectedEntries] = useState(new Set());
    const cyRef = useRef(null);

    return (
        <div className='w-full h-full overflow-y-hidden relative'>
            <AlertDismissible alert={alert} setAlert={setAlert} />
            <ResizableSplitPane
                initialSplitPosition={30}
                leftContent={
                    <GraphQuery
                        selectedEntries={selectedEntries}
                        setSelectedEntries={setSelectedEntries}
                        config={config}
                        setConfig={setConfig}
                        SearchComponent={NoteGraphSearch(noteId)}
                        ref={cyRef} // pass cytoscape instance to GraphQuery
                    />
                }
                rightContent={
                    <div className='relative'>
                        <Graph
                            onLinkClick={(link) => {
                                setSelectedEntries([link.source, link.target]);
                            }}
                            onNodesSelected={(nodes) => {
                                console.log(nodes);
                                setSelectedEntries(nodes);
                            }}
                            config={config}
                            ref={cyRef} // pass setter to receive the cytoscape instance
                        />
                    </div>
                }
            />
        </div>
    );
}
