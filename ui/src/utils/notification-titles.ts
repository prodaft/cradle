import {
    BellSimpleIcon,
    CheckCircleIcon,
    FileTextIcon,
    ShieldCheckIcon,
    SparkleIcon,
    UserPlusIcon,
    WarningCircleIcon,
    type IconWeight,
} from '@phosphor-icons/react';
import { createElement, type ComponentType, type ReactNode } from 'react';

type NotificationIcon = ComponentType<{
    size?: number | string;
    weight?: IconWeight;
    className?: string;
}>;

const NOTIFICATIONS: Record<string, { title: string; icon: NotificationIcon; destructive?: boolean }> =
    {
        request_access_notification: { title: 'Access request', icon: ShieldCheckIcon },
        access_granted_notification: { title: 'Access granted', icon: CheckCircleIcon },
        new_user_notification: { title: 'New user', icon: UserPlusIcon },
        report_render_notification: { title: 'Report ready', icon: FileTextIcon },
        report_processing_error_notification: {
            title: 'Report failed',
            icon: WarningCircleIcon,
            destructive: true,
        },
        enrichment_complete_notification: { title: 'Enrichment complete', icon: SparkleIcon },
        enrichment_error_notification: {
            title: 'Enrichment failed',
            icon: WarningCircleIcon,
            destructive: true,
        },
        message_notification: { title: 'Message', icon: BellSimpleIcon },
    };

/** Title shown on a notification card, toast, and system notification. */
export function notificationTitle(type: string | undefined): string {
    if (!type) return 'Notification';
    return NOTIFICATIONS[type]?.title ?? 'Notification';
}

/** Icon shown on a notification card and on the in-app toast. */
export function notificationIcon(type: string | undefined): NotificationIcon {
    if (!type) return BellSimpleIcon;
    return NOTIFICATIONS[type]?.icon ?? BellSimpleIcon;
}

/** Filled icon for a Sonner toast. */
export function notificationToastIcon(type: string | undefined): ReactNode {
    return createElement(notificationIcon(type), { size: 16, weight: 'fill' });
}

export function notificationDestructive(type: string | undefined): boolean {
    if (!type) return false;
    return NOTIFICATIONS[type]?.destructive ?? false;
}
