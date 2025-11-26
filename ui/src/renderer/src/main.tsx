import * as Sentry from '@sentry/react';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import 'prismjs/themes/prism-tomorrow.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

import './styles/fonts.css';
import './styles/main.css';

Sentry.init({
    dsn: 'https://da023724f698011d4e2280daccd1a492@apm.prodaft.com/37',
});

const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
