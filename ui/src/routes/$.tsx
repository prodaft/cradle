import { createFileRoute } from '@tanstack/react-router';
import NotFound from 'src/components/feedback/NotFound';

// @ts-ignore
export const Route = createFileRoute('/$')({
    component: NotFound,
});
