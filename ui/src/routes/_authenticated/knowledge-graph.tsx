import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const GraphExplorer = lazy(() => import('@/components/domain/graph/graph-explorer'));
const KnowledgeGraphSearch = lazy(
    () => import('@/components/domain/graph/knowledge-graph-search'),
);

export const Route = createFileRoute('/_authenticated/knowledge-graph')({
    staticData: {
        breadcrumb: 'Graph Explorer',
    },
    component: () => <GraphExplorer GraphSearchComponent={KnowledgeGraphSearch} />,
});
