import MainDashboard from 'src/components/domain/dashboard/MainDashboard';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/')({
    component: MainDashboard,
});
