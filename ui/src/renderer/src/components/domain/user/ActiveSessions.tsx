import ActionConfirmationModal from '@/components/modals/base/ActionConfirmationModal';
import { useModal } from '@/contexts/ui/ModalContext';
import { toast } from 'sonner';
import { useAuth } from '@hooks';
import { getApiBaseUrl } from '@/utils/url';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';


interface UserSession {
    id: string;
    refresh_token_jti: string;
    device_info: string | null;
    ip_address: string | null;
    created_at: string;
    last_activity: string;
    expires_at: string;
    is_current: boolean;
}

interface ActiveSessionsProps {
    userId: string;
}

/**
 * ActiveSessions component - Displays and manages active user sessions
 */
export default function ActiveSessions({ userId }: ActiveSessionsProps) {
    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { setModal } = useModal();
    const auth = useAuth();
    const basePath = getApiBaseUrl(auth.basePath);

    const fetchSessions = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await auth.getAccessToken();
            const response = await fetch(`${basePath}/users/${userId}/sessions/`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setSessions(data);
            } else {
                console.error('Failed to fetch sessions');
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setIsLoading(false);
        }
    }, [userId, basePath, auth]);

    const getCurrentSessionJti = useCallback((): string | null => {
        // Get the refresh token from localStorage and decode it to get the JTI
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) return null;

        try {
            // Decode JWT token (base64url decode the payload)
            const parts = refreshToken.split('.');
            if (parts.length !== 3) return null;

            const payload = JSON.parse(
                atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
            );
            return payload.jti || null;
        } catch (error) {
            console.error('Error decoding refresh token:', error);
            return null;
        }
    }, []);

    const revokeSession = useCallback(
        async (sessionId: string) => {
            try {
                const token = await auth.getAccessToken();
                const response = await fetch(
                    `${basePath}/users/${userId}/sessions/${sessionId}/`,
                    {
                        method: 'DELETE',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    },
                );

            if (response.ok) {
                toast.success('Session revoked successfully');
                
                // Check if this is the current session by comparing JTI
                const session = sessions.find(s => s.id === sessionId);
                const currentJti = getCurrentSessionJti();
                const isCurrentSession = session && currentJti && session.refresh_token_jti === currentJti;
                
                // If current session was revoked, log out immediately
                if (isCurrentSession || session?.is_current) {
                    // Clear tokens and log out
                    auth.logOut();
                } else {
                    fetchSessions();
                }
            } else {
                toast.error('Failed to revoke session');
            }
        } catch (error) {
            console.error('Error revoking session:', error);
            toast.error('Failed to revoke session');
        }
    }, [userId, basePath, auth, sessions, fetchSessions, getCurrentSessionJti]);

    const openRevokeConfirmationModal = useCallback(
        (sessionId: string) => {
            const session = sessions.find((s) => s.id === sessionId);
            const currentJti = getCurrentSessionJti();
            const isCurrentSession =
                session && currentJti && session.refresh_token_jti === currentJti;

            setModal(ActionConfirmationModal, {
                onConfirm: () => revokeSession(sessionId),
                text: isCurrentSession
                    ? 'Are you sure you want to revoke this session? This is your current session and you will be logged out immediately.'
                    : 'Are you sure you want to revoke this session? The device will be signed out and will need to sign in again.',
            });
        },
        [sessions, setModal, revokeSession, getCurrentSessionJti],
    );

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const formatDeviceInfo = (deviceInfo: string | null): string => {
        if (!deviceInfo) return 'Unknown device';
        // Truncate long device info
        return deviceInfo.length > 50
            ? deviceInfo.substring(0, 50) + '...'
            : deviceInfo;
    };

    // Mark current session by comparing JTI
    const currentJti = getCurrentSessionJti();
    const sessionsWithCurrent = sessions.map((session) => ({
        ...session,
        is_current: currentJti
            ? session.refresh_token_jti === currentJti
            : session.is_current,
    }));

    if (isLoading) {
        return (
            <div className='py-2'>
                <div className='text-sm text-muted-foreground'>Loading sessions...</div>
            </div>
        );
    }

    if (sessions.length === 0) {
        return (
            <div className='py-2'>
                <div className='text-sm text-muted-foreground'>No active sessions</div>
            </div>
        );
    }

    return (
        <div className='py-2 space-y-3'>
            {sessionsWithCurrent.map((session, index) => (
                <div key={session.id}>
                    <div className='flex items-center justify-between'>
                        <div className='flex-1'>
                            <div className='flex items-center gap-2'>
                                <span className='text-sm text-muted-foreground'>
                                    {formatDeviceInfo(session.device_info)}
                                </span>
                                {session.is_current && (
                                    <span className='text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30'>
                                        Current
                                    </span>
                                )}
                            </div>
                            <div className='text-xs text-muted-foreground mt-0.5'>
                                {session.ip_address && (
                                    <span className='mr-3'>
                                        IP: {session.ip_address}
                                    </span>
                                )}
                                <span>
                                    Last activity: {formatDate(session.last_activity)}
                                </span>
                            </div>
                        </div>
                        <Button
                            type='button'
                            onClick={() => openRevokeConfirmationModal(session.id)}
                            variant='outline'
                            size='sm'
                            className='ml-4'
                            title='Revoke session'
                        >
                            Revoke
                        </Button>
                    </div>
                    {index < sessionsWithCurrent.length - 1 && (
                        <div className='h-px bg-border/50 my-3' />
                    )}
                </div>
            ))}
        </div>
    );
}
