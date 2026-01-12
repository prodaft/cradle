import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const GraphExplorer = lazy(() => import('@/components/domain/graph/GraphExplorer'));
const GraphSearch = lazy(() => import('@/components/domain/graph/GraphSearch'));

export const Route = createFileRoute('/_authenticated/knowledge-graph')({
    component: () => <GraphExplorer GraphSearchComponent={GraphSearch} />,
});
