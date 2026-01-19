import { createFileRoute } from '@tanstack/react-router';
import NotFound from 'src/components/feedback/NotFound';

export const Route = createFileRoute('/not-found')({
    component: () => (
        <NotFound message="We can't seem to find the page you are looking for." />
    ),
});
