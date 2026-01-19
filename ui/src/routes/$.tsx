import { createFileRoute } from '@tanstack/react-router';
import NotFound from 'src/components/feedback/NotFound';

export const Route = createFileRoute('/$')({
    component: NotFound,
});
