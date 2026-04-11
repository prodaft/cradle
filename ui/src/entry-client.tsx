import { registerOpenapiAuthCallbacks } from '@services/openapi/client-auth';
import { StartClient } from '@tanstack/react-start/client';
import { Buffer } from 'buffer';
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';

if (typeof globalThis.Buffer === 'undefined') globalThis.Buffer = Buffer;

registerOpenapiAuthCallbacks();

startTransition(() => {
    hydrateRoot(
        document,
        <StrictMode>
            <StartClient />
        </StrictMode>,
    );
});
