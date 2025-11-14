import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/custom-select.css';
import './components/ui/ui.css';
import './components/notifications/notifications.css';
import './index.css';
import App from './App';

window.addEventListener('error', (event) => {
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <App />
);
