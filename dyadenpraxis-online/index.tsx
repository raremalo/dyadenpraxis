import './src/index.css';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';
import * as Sentry from '@sentry/react';
import App from './App';
import { scrubEventPii, scrubBreadcrumb } from './lib/sentry';

// Sentry DSN-gated: ohne VITE_SENTRY_DSN bleibt alles No-Op (Dev, E2E,
// unkonfigurierte Deployments). Init VOR dem ersten Render, damit Mount-
// Fehler mitkommen. PII-Scrubbing: lib/sentry.ts (DSGVO).
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    // Deploy-Korrelation: Commit-SHA auf Vercel (vite define), sonst
    // package.json-Version (lokal identisch pro Checkout).
    release: `dyadenpraxis-online@${__APP_VERSION__}`,
    integrations: [
      // React Router 7 im Library-Modus: Instrumentierung braucht die
      // Router-Hooks als Parameter (offizielles Sentry-Pattern).
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      // Console-Breadcrumbs AUS: console.*(…)-Argumente (Partner-Namen,
      // Fehlerdetails) würden ungefiltert als crumb.data.arguments wandern.
      Sentry.breadcrumbsIntegration({ console: false }),
    ],
    // Trace-Header NUR same-origin (Default-Verhalten) + localhost: Die
    // eigene /api/*-Korrelation braucht relative Pfade (^\); Supabase/Daily
    // wären Cross-Origin und müssten sentry-trace/baggage in ihren CORS-
    // Allow-Headern aufnehmen — sonst bricht das Preflight.
    tracePropagationTargets: ['localhost', /^\//],
    tracesSampleRate: 0.2,
    environment: import.meta.env.MODE,
    // DSGVO/Security: Scrubbing s. lib/sentry.ts. beforeSend greift NUR für
    // Error-Events — Transaktionen laufen durch beforeSendTransaction und
    // tragen dieselbe request.url mit Recovery-/Invite-Tokens.
    beforeSend: scrubEventPii,
    beforeSendTransaction: scrubEventPii,
    // Spans (auch aus Transaktionen) tragen die volle URL in url.full
    beforeSendSpan: (span) => {
      const url = span.data?.['url.full'];
      if (typeof url === 'string' && span.data) {
        span.data['url.full'] = url.split(/[?#]/)[0];
      }
      return span;
    },
    // Breadcrumbs vor dem Versand scrubben (Navigation from/to mit Query,
    // Fetch-URLs, ui.*-Attributwerte mit Namen)
    beforeBreadcrumb: scrubBreadcrumb,
    ignoreErrors: [
      // Browser-Extension-Rauschen, kein App-Bug
      'Object Not Found Matching Id',
      'Non-Error promise rejection captured',
    ],
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service Worker für Push Notifications registrieren
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[App] Service Worker registriert:', registration.scope);
      })
      .catch((error) => {
        console.error('[App] Service Worker Registration fehlgeschlagen:', error);
        // No-Op ohne initialisiertes Sentry (kein DSN)
        Sentry.captureException(error, {
          mechanism: { handled: true, type: 'ServiceWorkerRegistration' },
        });
      });
  });
}
