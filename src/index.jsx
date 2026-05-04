import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import './styles/theme.css';
import './styles/animations.css';
import './styles/space.css';
import './styles/responsive.css';
import { initStorageSync, loadFromSupabase } from './services/storageSync';

initStorageSync();

async function bootstrap() {
  await Promise.race([
    loadFromSupabase(),
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ]);

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
