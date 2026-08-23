import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { bootCloud } from './services/boot';
import { isFirebaseConfigured } from './services/firebase';

function FirebaseMissing({ error }) {
  return (
    <main className="min-h-dvh p-4 md:p-8 flex items-center justify-center">
      <section className="max-w-md space-y-3">
        <h1 className="font-display text-3xl">Firebase obrigatório</h1>
        <p className="text-sm text-outline">
          {error?.message ||
            'Configure FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID e FIREBASE_APP_ID em apps/freelanoleste/.env'}
        </p>
      </section>
    </main>
  );
}

const root = createRoot(document.getElementById('root'));

if (!isFirebaseConfigured()) {
  root.render(<FirebaseMissing />);
} else {
  bootCloud()
    .then(() => {
      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      );
    })
    .catch((error) => {
      root.render(<FirebaseMissing error={error} />);
    });
}
