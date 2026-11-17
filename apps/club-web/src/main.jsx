import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Router } from '@jalingo/shared';
import '@jalingo/shared/base.css';
import './theme.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<StrictMode><Router><App /></Router></StrictMode>);
