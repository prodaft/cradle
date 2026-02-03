import { StartClient } from '@tanstack/react-start/client';
import { Buffer } from 'buffer';
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';

if (typeof globalThis.Buffer === 'undefined') globalThis.Buffer = Buffer;

startTransition(() => {
    hydrateRoot(
        document,
        <StrictMode>
            <StartClient />
        </StrictMode>,
    );
});
