import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import App from './app.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);