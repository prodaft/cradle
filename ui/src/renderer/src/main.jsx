import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import 'prismjs/themes/prism-tomorrow.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/fonts.css';
import './styles/main.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);