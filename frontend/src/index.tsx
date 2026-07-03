import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import './styles/index.scss';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import App from './App';
import { applySystemBrandHead } from './utils/applySystemBrandHead';

applySystemBrandHead();

window.addEventListener('error', (event) => {
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
});

// Desregistrar Service Workers antigos (removido para evitar erros de cache)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });
  });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <App />
);
