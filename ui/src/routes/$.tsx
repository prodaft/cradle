import { createFileRoute } from '@tanstack/react-router';
import NotFound from '@/components/feedback/not-found';

// @ts-ignore
export const Route = createFileRoute('/$')({
    component: NotFound,
});
