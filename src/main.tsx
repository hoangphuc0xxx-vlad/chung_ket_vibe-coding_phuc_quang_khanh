import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Bản đã triển khai: lưu sẵn các file của app để mở lại được khi mất mạng.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(async () => {
        const urls = ['/', '/index.html', ...performance.getEntriesByType('resource').map((e) => e.name)].filter(
          (u) => u.startsWith('/') || u.startsWith(location.origin),
        );
        const cache = await caches.open('ttv-v1');
        await Promise.all(urls.map((u) => cache.add(u).catch(() => undefined)));
      })
      .catch(() => undefined);
  });
}
