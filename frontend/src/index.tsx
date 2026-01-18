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

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((_registration) => {
      })
      .catch((_registrationError) => {
      });
  });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <App />
);
