import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.scss';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import App from './App';

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
      console.log('[SW] Service Worker desregistrado');
    });
  });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <App />
);
