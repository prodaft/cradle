import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const GraphExplorer = lazy(() => import('src/components/domain/graph/GraphExplorer'));
const KnowledgeGraphSearch = lazy(
    () => import('src/components/domain/graph/KnowledgeGraphSearch'),
);

export const Route = createFileRoute('/_authenticated/knowledge-graph')({
    staticData: {
        breadcrumb: 'Graph Explorer',
    },
    component: () => <GraphExplorer GraphSearchComponent={KnowledgeGraphSearch} />,
});
