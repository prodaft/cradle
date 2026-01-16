import NotFound from 'src/components/feedback/NotFound';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/$')({
    component: NotFound,
});
