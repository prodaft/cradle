import { createFileRoute } from '@tanstack/react-router';
import MainDashboard from 'src/components/domain/dashboard/MainDashboard';

export const Route = createFileRoute('/_authenticated/')({
    component: MainDashboard,
});
