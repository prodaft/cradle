import React, { useState, useRef, forwardRef } from 'react';
import { PlaySolid, PauseSolid, ArrowLeft, ArrowRight } from 'iconoir-react';
import Datepicker from 'react-tailwindcss-datepicker';
import { format, parseISO } from 'date-fns';
import { fetchGraph } from '../../services/graphService/graphService';
import { LinkTreeFlattener, truncateText } from '../../utils/dashboardUtils/dashboardUtils';
import AlertBox from '../AlertBox/AlertBox';

const PaginatedGraphFetch = forwardRef(
    ({ initialValues, processNewNode, addEdge }, graphRef) => {
  const [isGraphFetching, setIsGraphFetching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
  const fetchingCancelled = useRef(false);

  // Add date range state
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 30 days ago
    endDate: format(new Date(), 'yyyy-MM-dd') // today
  });

  const fetchGraphPage = async (page) => {
    setLoading(true);
    setIsGraphFetching(true);

    try {
      if (fetchingCancelled.current) return;

      // Include date range in the fetch request
      const response = await fetchGraph(page, pageSize, dateRange.startDate, dateRange.endDate);
      const has_next = response.data.has_next;
      const { entries, relations, colors } = response.data.results;

      setHasNextPage(has_next);
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

    } catch (error) {
      setAlert({
        show: true,
        message: error.message,
        color: 'red',
      });
    } finally {
      setLoading(false);
      setIsGraphFetching(false);
    }
  };

  const handleFetchPage = (page) => {
    if (page < 1) return;
    setCurrentPage(page);
    fetchGraphPage(page);
  };

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
  };

  const handleToggleFetching = () => {
    if (isGraphFetching) {
      fetchingCancelled.current = true;
      setIsGraphFetching(false);
    } else {
      fetchingCancelled.current = false;
      fetchGraphPage(currentPage);
    }
  };

  const handleDateRangeChange = (value) => {
    if (value.startDate && value.endDate) {
      setDateRange({
        startDate: format(value.startDate, 'yyyy-MM-dd'),
        endDate: format(value.endDate, 'yyyy-MM-dd'),
      });

      // Reset to first page when date range changes
      setCurrentPage(1);
    }
  };

  return (
    <div className="p-2 mt-2">
      <div className="flex items-center space-x-3 w-full">
        <button
          type="button"
          onClick={handleToggleFetching}
          className="btn btn flex items-center tooltip tooltip-bottom"
          data-tooltip={isGraphFetching ? 'Stop fetching data' : 'Fetch graph data'}
          disabled={loading && !isGraphFetching}
        >
          {isGraphFetching ? (
            <>
              <PauseSolid className="text-primary mr-1 w-4" /> Stop
            </>
          ) : (
            <>
              <PlaySolid className="text-primary mr-1 w-4" /> Fetch
            </>
          )}
        </button>

        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-500">Size:</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="input w-full py-0 px-1 text-xs"
            disabled={isGraphFetching}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>

        <div className="flex items-center">
          <span className="text-xs text-gray-500 mr-1">Date:</span>
          <Datepicker
            value={{
              startDate: parseISO(dateRange.startDate),
              endDate: parseISO(dateRange.endDate),
            }}
            onChange={handleDateRangeChange}
            inputClassName="input input-block py-0 px-2 text-sm flex-grow !max-w-full w-full"
            toggleClassName="hidden"
            disabled={isGraphFetching}
          />
        </div>
      </div>

      {loading && !isGraphFetching && (
        <div className="flex justify-center py-1">
          <div className="spinner-dot-pulse">
            <div className="spinner-pulse-dot"></div>
          </div>
        </div>
      )}

      <AlertBox alert={alert} />
    </div>
  );
});

export default PaginatedGraphFetch;
