import NotFound from '@/components/feedback/not-found';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/$')({
    component: NotFound,
});
