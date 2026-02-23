import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
} from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';

export interface OAuthConnection {
    provider: string;
    label: string;
    connected: boolean;
}

interface OAuthTabProps {
    connections: OAuthConnection[];
    busyProvider: string | null;
    disconnectPending: boolean;
    onConnect: (provider: string) => void;
    onDisconnect: (provider: string) => void;
}

export default function OAuthTab({
    connections,
    busyProvider,
    disconnectPending,
    onConnect,
    onDisconnect,
}: OAuthTabProps) {
    if (connections.length === 0) {
        return (
            <section id='oauth'>
                <p className='text-sm text-muted-foreground'>
                    No OAuth providers are configured
                </p>
            </section>
        );
    }

    return (
        <section id='oauth'>
            <div className='flex flex-col gap-4'>
                {connections.map(({ provider, label, connected }, index) => (
                    <div key={provider}>
                        <Field orientation='horizontal' className='gap-2'>
                            <FieldContent className='flex-1'>
                                <FieldLabel className='text-sm block mb-0.5'>
                                    {label}
                                </FieldLabel>
                                <FieldDescription>
                                    {connected ? 'Connected' : 'Not connected'}
                                </FieldDescription>
                            </FieldContent>
                            <Button
                                type='button'
                                variant={connected ? 'destructive' : 'outline'}
                                size='sm'
                                className='self-center'
                                onClick={() => {
                                    if (connected) {
                                        onDisconnect(provider);
                                    } else {
                                        onConnect(provider);
                                    }
                                }}
                                disabled={
                                    busyProvider === provider || disconnectPending
                                }
                            >
                                {connected ? 'Disconnect' : 'Connect'}
                            </Button>
                        </Field>
                        {index < connections.length - 1 && <Separator />}
                    </div>
                ))}
            </div>
        </section>
    );
}
