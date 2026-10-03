import { Toaster } from '@/components/ui/sonner';
import { useTheme } from '@/contexts/ui';

export function AppToaster() {
    const { isDarkMode } = useTheme();

    return <Toaster theme={isDarkMode ? 'dark' : 'light'} />;
}
