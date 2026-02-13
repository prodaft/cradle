import { createFileRoute } from '@tanstack/react-router';
import NotFound from '@/components/feedback/not-found';

export const Route = createFileRoute('/not-found')({
    component: () => (
        <NotFound message="We can't seem to find the page you are looking for." />
    ),
});
