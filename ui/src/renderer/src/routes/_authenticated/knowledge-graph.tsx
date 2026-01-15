import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const GraphExplorer = lazy(() => import('@/components/domain/graph/GraphExplorer'));
const KnowledgeGraphSearch = lazy(
    () => import('@/components/domain/graph/KnowledgeGraphSearch'),
);

export const Route = createFileRoute('/_authenticated/knowledge-graph')({
    component: () => <GraphExplorer GraphSearchComponent={KnowledgeGraphSearch} />,
});
