import * as Sentry from '@sentry/react';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
import 'prismjs/themes/prism-tomorrow.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

import '@styles/main.css';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (sentryDsn) {
    Sentry.init({
        dsn: sentryDsn,
    });
}

const container = document.getElementById('root')!;
const root = createRoot(container);

const shouldRewriteOAuth = (() => {
    const url = new URL(window.location.href);
    const hasOAuthParams =
        url.searchParams.has('code') ||
        url.searchParams.has('state') ||
        url.searchParams.has('error');

    if (
        hasOAuthParams &&
        (url.pathname === '/' || url.pathname === '/oauth/callback')
    ) {
        window.location.replace(`${url.origin}/oauth/callback${url.search}`);
        return true;
    }

    return false;
})();

if (!shouldRewriteOAuth) {
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
    );
}
