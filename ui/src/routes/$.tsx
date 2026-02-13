import NotFound from '@/components/feedback/not-found';
import { createFileRoute } from '@tanstack/react-router';

// @ts-ignore
export const Route = createFileRoute('/$')({
    component: NotFound,
});
