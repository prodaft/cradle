import './styles/fonts.css';
import './styles/main.css';
import 'prismjs/themes/prism-tomorrow.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { worker } from './mocks/browser';

// worker.start();
//
// async function enableMocking() {
//     if (import.meta.env.MODE !== 'demo') {
//         return;
//     }
//
//     const { worker } = await import('./mocks/browser');
//
//     return worker.start();
// }

// enableMocking().then(() => {
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
// });
