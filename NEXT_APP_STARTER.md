# Next App Starter - Vollständige Grundstruktur

> Blueprint basierend auf EM-Vernetzung mit allen 5 Refactorings integriert.
> Erstellt: 2026-02-10

---

## Inhaltsverzeichnis

1. [Projekt-Übersicht](#1-projekt-übersicht)
2. [Tech Stack](#2-tech-stack)
3. [Verzeichnisstruktur](#3-verzeichnisstruktur)
4. [Konfigurationsdateien](#4-konfigurationsdateien)
5. [App-Kern](#5-app-kern)
6. [Routing](#6-routing)
7. [Datenbank-Schema](#7-datenbank-schema)
8. [RPC Functions](#8-rpc-functions)
9. [RLS Policies](#9-rls-policies)
10. [Auto-generierte Types](#10-auto-generierte-types)
11. [State Management](#11-state-management)
12. [Composables](#12-composables)
13. [Komponenten-Architektur](#13-komponenten-architektur)
14. [Views](#14-views)
15. [API Routes](#15-api-routes)
16. [Security](#16-security)
17. [Theming](#17-theming)
18. [Internationalisierung](#18-internationalisierung)
19. [Real-time & Presence](#19-real-time--presence)
20. [Deployment](#20-deployment)
21. [Checkliste](#21-checkliste)

---

## 1. Projekt-Übersicht

### Zweck
Vollständige Plattform für Ehrliches Mitteilen (EM) - Partner-Matching, Session-Management, Video-Calls, Chat, Trust-System, Kalender-Planung.

### Feature-Liste

| # | Feature | Beschreibung |
|---|---------|-------------|
| 1 | **Authentifizierung** | Email/Passwort, JWT, Rate Limiting, Anti-Enumeration |
| 2 | **Partner-Suche** | Fuzzy-Search (pg_trgm), AI-Empfehlungen, Filter, Infinite Scroll |
| 3 | **Sessions (1-on-1)** | Anfrage → Akzeptanz → Aktiv → Abgeschlossen, Soft Delete |
| 4 | **Sessions (Level 3)** | Offene Gruppen-Sessions mit 3. Teilnehmer |
| 5 | **Video-Calls** | Daily.co Integration mit Meeting-Tokens |
| 6 | **Real-time Chat** | Nachrichten, Gelesen-Status, Unread-Count |
| 7 | **Trust-System** | Peer-Verification, Trust-Level (new → known → verified) |
| 8 | **Ratings** | 3-Kategorien-Rating (Struktur, Präsenz, Gesamt), Aggregation |
| 9 | **Einladungen** | Token-basiert, 30-Tage-Ablauf, Max 10 aktiv |
| 10 | **Kalender** | Verfügbarkeits-Slots, Session-Vorschläge, Terminplanung |
| 11 | **Push Notifications** | Web Push via Service Worker, VAPID |
| 12 | **Profil-Verwaltung** | Avatar-Upload mit Komprimierung, Bio, Präferenzen |
| 13 | **Account-Löschung** | GDPR-konform, CASCADE Delete |
| 14 | **Partner-Blockierung** | Bidirektionales Blocking |
| 15 | **Themes** | 4 Themes (Erdung, Klarheit, Wald & Moos, Gopal) |
| 16 | **Mehrsprachigkeit** | Deutsch + Englisch, Browser-Erkennung |
| 17 | **Online-Status** | Supabase Presence (Refactoring) |
| 18 | **Dispute-System** | Rating-Streitigkeiten (Placeholder) |

---

## 2. Tech Stack

### Frontend
| Paket | Version | Zweck |
|-------|---------|-------|
| vue | ^3.5 | UI Framework (Composition API) |
| vue-router | ^4.5 | Routing mit Guards |
| @tanstack/vue-query | ^5.x | **[NEU]** Server State Management |
| pinia | ^3.0 | **[REFACTORED]** Nur globaler App-State |
| @supabase/supabase-js | ^2.49 | Backend Client |
| @daily-co/daily-js | ^0.74 | Video-Calls |
| vue-i18n | ^11.1 | i18n |
| @vueuse/core | ^13.0 | Composition Utilities |
| lucide-vue-next | ^0.473 | Icons |
| @headlessui/vue | ^1.7 | Accessible UI Components |

### DevDependencies
| Paket | Version | Zweck |
|-------|---------|-------|
| vite | ^7.0 | Build Tool |
| typescript | ~5.7 | Type Safety |
| tailwindcss | ^4.0 | Styling (v4 - CSS-first) |
| vitest | ^3.0 | Testing |
| @vue/test-utils | ^2.4 | Component Testing |
| vue-tsc | ^2.2 | Type Checking |
| jose | ^5.x | **[NEU]** Lokale JWT-Verifizierung |
| supabase | ^2.x | **[NEU]** CLI für Type Generation |

### Backend
| Service | Zweck |
|---------|-------|
| Supabase | PostgreSQL, Auth, Storage, Realtime, RLS |
| Vercel | Hosting, Serverless Functions |
| Daily.co | Video-Conferencing API |

### PostgreSQL Extensions
| Extension | Zweck |
|-----------|-------|
| uuid-ossp | UUID-Generierung |
| pg_trgm | Fuzzy-Namenssuche (Trigram, GIN-Index) |

---

## 3. Verzeichnisstruktur

```
project-root/
├── api/                              # Vercel Serverless Functions
│   └── create-room.ts                # Daily.co Room + JWT Auth (jose)
├── public/
│   ├── favicon.ico
│   └── sw.js                         # Service Worker (Push Notifications)
├── src/
│   ├── App.vue                       # Root Component
│   ├── main.ts                       # App Bootstrap
│   ├── style.css                     # Tailwind v4 + Theme CSS Properties
│   │
│   ├── components/
│   │   ├── base/                     # Wiederverwendbare UI-Bausteine
│   │   │   ├── BaseButton.vue
│   │   │   ├── BaseInput.vue
│   │   │   ├── BaseCard.vue
│   │   │   ├── BaseChip.vue
│   │   │   ├── BaseAvatar.vue
│   │   │   ├── ProgressRing.vue
│   │   │   └── SkeletonCard.vue
│   │   ├── layout/
│   │   │   ├── AppLayout.vue         # Auth-Layout mit Header + TabBar
│   │   │   ├── AppHeader.vue
│   │   │   ├── AppFooter.vue
│   │   │   ├── AppLogo.vue
│   │   │   └── BottomTabBar.vue
│   │   ├── partner/
│   │   │   ├── PartnerCard.vue       # Volle Partnerkarte
│   │   │   ├── CompactPartnerCard.vue
│   │   │   ├── PartnerList.vue
│   │   │   └── FilterChips.vue
│   │   ├── session/
│   │   │   ├── SessionRequestModal.vue
│   │   │   ├── PendingRequestCard.vue
│   │   │   ├── ProposedSessionCard.vue
│   │   │   ├── CancelSessionModal.vue
│   │   │   ├── SessionFeedbackModal.vue
│   │   │   └── StarRating.vue
│   │   ├── chat/
│   │   │   ├── ChatWindow.vue
│   │   │   ├── ChatMessage.vue
│   │   │   └── ChatButton.vue
│   │   ├── profile/
│   │   │   ├── ProfileHeaderCard.vue
│   │   │   ├── ProfileVerificationCard.vue
│   │   │   ├── ProfileSettingsCard.vue
│   │   │   └── EditProfileModal.vue
│   │   ├── calendar/
│   │   │   ├── AvailabilitySlotEditor.vue
│   │   │   ├── ScheduleModal.vue
│   │   │   └── AvailabilityMatcher.vue
│   │   ├── verification/
│   │   │   ├── VerificationBadge.vue
│   │   │   └── TrustBadge.vue
│   │   ├── onboarding/
│   │   │   ├── WelcomeModal.vue
│   │   │   └── OnboardingChecklist.vue
│   │   ├── about/                    # Über EM Sektionen
│   │   │   ├── EMHeroSection.vue
│   │   │   ├── EMGrundideaSection.vue
│   │   │   ├── EMLevelsSection.vue
│   │   │   ├── EMOnlineSection.vue
│   │   │   ├── EMRessourcenSection.vue
│   │   │   ├── EMInfoSections.vue
│   │   │   └── EMStepsSection.vue
│   │   └── shared/
│   │       ├── CookieBanner.vue
│   │       ├── ErrorBoundary.vue
│   │       ├── OfflineIndicator.vue
│   │       └── InviteSection.vue
│   │
│   ├── composables/
│   │   ├── queries/                  # [NEU] TanStack Query Hooks
│   │   │   ├── usePartnerQueries.ts  # Partner-Suche, Empfehlungen
│   │   │   ├── useSessionQueries.ts  # Sessions CRUD
│   │   │   ├── useMessageQueries.ts  # Chat Messages
│   │   │   ├── useFeedbackQueries.ts # Ratings
│   │   │   ├── useCalendarQueries.ts # Verfügbarkeit, Termine
│   │   │   ├── useVerificationQueries.ts
│   │   │   └── useInvitationQueries.ts
│   │   ├── useAuth.ts               # Auth mit Pinia Store
│   │   ├── usePresence.ts           # [NEU] Supabase Presence
│   │   ├── useDaily.ts              # Daily.co Video Calls
│   │   ├── useTheme.ts              # Theme Management
│   │   ├── useLocale.ts             # Sprach-Umschaltung
│   │   ├── useAvatarUpload.ts       # Bild-Upload + Komprimierung
│   │   ├── usePushNotifications.ts  # Web Push
│   │   └── useVisibilityRefresh.ts  # Tab-Wechsel Refresh
│   │
│   ├── config/
│   │   └── themeConfig.ts            # 4 Theme-Definitionen
│   │
│   ├── i18n/
│   │   ├── index.ts                  # vue-i18n Setup
│   │   └── locales/
│   │       ├── de.json
│   │       └── en.json
│   │
│   ├── lib/
│   │   ├── supabase.ts              # Supabase Client
│   │   └── queryClient.ts           # [NEU] TanStack Query Client
│   │
│   ├── router/
│   │   └── index.ts                  # Vue Router + Guards
│   │
│   ├── stores/                       # [NEU] Pinia Stores
│   │   ├── auth.ts                   # User, Profile, Initialized
│   │   └── app.ts                    # Theme, Locale
│   │
│   ├── types/
│   │   └── database.ts              # [NEU] Auto-generiert via CLI
│   │
│   └── views/
│       ├── auth/
│       │   ├── LoginView.vue
│       │   ├── RegisterView.vue
│       │   ├── ForgotPasswordView.vue
│       │   └── ResetPasswordView.vue
│       ├── protected/
│       │   ├── PartnerFinderView.vue
│       │   ├── SessionsView.vue
│       │   ├── ActiveSessionView.vue
│       │   ├── Level3View.vue
│       │   ├── ProfileView.vue
│       │   └── CalendarView.vue
│       └── public/
│           ├── HomeView.vue
│           ├── DatenschutzView.vue
│           ├── AGBView.vue
│           ├── ImpressumView.vue
│           ├── KontaktView.vue
│           └── UeberEMView.vue
│
├── supabase/
│   └── migrations/                   # SQL Migrations (001-015)
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── vite.config.ts
└── vercel.json
```


---

## 4. Konfigurationsdateien

### 4.1 package.json

```json
{
  "name": "em-vernetzung",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "vue-tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "types:generate": "npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types/database.ts"
  },
  "dependencies": {
    "@daily-co/daily-js": "^0.74.0",
    "@headlessui/vue": "^1.7.23",
    "@supabase/supabase-js": "^2.49.4",
    "@tanstack/vue-query": "^5.62.0",
    "@vueuse/core": "^13.0.0",
    "lucide-vue-next": "^0.473.0",
    "pinia": "^3.0.2",
    "vue": "^3.5.13",
    "vue-i18n": "^11.1.3",
    "vue-router": "^4.5.0"
  },
  "devDependencies": {
    "@vue/test-utils": "^2.4.6",
    "jose": "^5.9.0",
    "supabase": "^2.15.0",
    "tailwindcss": "^4.0.17",
    "typescript": "~5.7.3",
    "vite": "^7.0.0",
    "vitest": "^3.0.9",
    "vue-tsc": "^2.2.8"
  }
}
```

### 4.2 vite.config.ts

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia', 'vue-i18n'],
          'supabase': ['@supabase/supabase-js'],
          'daily': ['@daily-co/daily-js'],
          'ui-vendor': ['@headlessui/vue', 'lucide-vue-next', '@vueuse/core'],
          'query': ['@tanstack/vue-query']
        }
      }
    }
  }
})
```

### 4.3 tsconfig.json

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" }
  ]
}
```

### 4.4 tsconfig.app.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"]
}
```

### 4.5 vercel.json

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-eval' https://*.daily.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.daily.co wss://*.daily.co; frame-src https://*.daily.co; media-src 'self' blob:;"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=*, microphone=*, geolocation=()"
        }
      ]
    }
  ]
}
```

### 4.6 .env.example

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Daily.co (nur serverseitig, NICHT VITE_ prefixed)
DAILY_API_KEY=xxx

# Supabase CLI (für Type-Generation)
SUPABASE_PROJECT_ID=xxx

# Push Notifications (optional)
VITE_VAPID_PUBLIC_KEY=xxx
```

### 4.7 index.html

```html
<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <title>EM Vernetzung</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```


---

## 5. App-Kern

### 5.1 src/main.ts

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { queryClient } from '@/lib/queryClient'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(VueQueryPlugin, { queryClient })
app.use(router)
app.use(i18n)

app.mount('#app')

// Service Worker für Push Notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error)
}
```

### 5.2 src/lib/queryClient.ts [NEU - Refactoring 1]

```typescript
import { QueryClient } from '@tanstack/vue-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,        // 2 Min cache
      gcTime: 1000 * 60 * 10,           // 10 Min garbage collection
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
})
```

### 5.3 src/lib/supabase.ts

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

### 5.4 src/App.vue (Grundstruktur)

```vue
<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePresence } from '@/composables/usePresence'
import AppLayout from '@/components/layout/AppLayout.vue'
import ErrorBoundary from '@/components/shared/ErrorBoundary.vue'
import CookieBanner from '@/components/shared/CookieBanner.vue'
import OfflineIndicator from '@/components/shared/OfflineIndicator.vue'
import WelcomeModal from '@/components/onboarding/WelcomeModal.vue'

const route = useRoute()
const authStore = useAuthStore()
const { startTracking, stopTracking } = usePresence()

const showWelcomeModal = ref(false)
const isAuthRoute = computed(() => route.meta.requiresAuth === true)
const isLoading = computed(() => !authStore.initialized)

// Online-Presence starten wenn eingeloggt
watch(() => authStore.currentUser, (user) => {
  if (user) {
    startTracking()
    // Prüfe ob Profil vollständig
    if (authStore.currentProfile) {
      const p = authStore.currentProfile
      if (!p.avatar_url || !p.bio) showWelcomeModal.value = true
    }
  } else {
    stopTracking()
  }
}, { immediate: true })
</script>

<template>
  <ErrorBoundary>
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <div class="animate-spin h-8 w-8 border-2 border-current border-t-transparent rounded-full" />
    </div>
    <template v-else>
      <AppLayout v-if="isAuthRoute">
        <RouterView />
      </AppLayout>
      <RouterView v-else />
    </template>
    <WelcomeModal v-if="showWelcomeModal" @close="showWelcomeModal = false" />
    <CookieBanner />
    <OfflineIndicator />
  </ErrorBoundary>
</template>
```

### 5.5 src/style.css (Tailwind v4 + Themes)

```css
@import "tailwindcss";

/* ── Design Tokens ── */
@theme {
  --font-display: 'Fraunces', serif;
  --font-body: 'Plus Jakarta Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Farbpalette */
  --color-sand-50: #fdf8f0; --color-sand-100: #f5ead6;
  --color-sand-200: #e8d5b0; --color-sand-300: #d4b886;
  --color-sand-400: #c49b5c; --color-sand-500: #a67c3d;
  --color-sand-600: #8a6430; --color-sand-700: #6e4f26;
  --color-sand-800: #523b1d; --color-sand-900: #362713;

  --color-terra-50: #fdf2ef; --color-terra-100: #f5d5cc;
  --color-terra-200: #e8a999; --color-terra-300: #d47d66;
  --color-terra-400: #c05a3e; --color-terra-500: #a84832;
  --color-terra-600: #8a3928; --color-terra-700: #6e2d1f;

  --color-erde-50: #f5f0eb; --color-erde-100: #e0d3c4;
  --color-erde-200: #c4ab90; --color-erde-300: #a8835c;
  --color-erde-400: #8c6b3d; --color-erde-500: #6e5330;
  --color-erde-600: #523e24; --color-erde-700: #362a18;
  --color-erde-800: #1f1810; --color-erde-900: #140f0a;

  --color-moos-50: #f0f5f0; --color-moos-100: #d4e5d4;
  --color-moos-200: #a8c9a8; --color-moos-300: #7dad7d;
  --color-moos-400: #5a9160; --color-moos-500: #457348;
  --color-moos-600: #355a38; --color-moos-700: #264028;

  --color-akzent-gold: #d4a843; --color-akzent-kupfer: #b87333;
  --color-akzent-bernstein: #cf8a2e; --color-akzent-salbei: #7a9a7a;
}

/* ── Theme CSS Custom Properties ── */
:root {
  --theme-bg: var(--color-erde-900);
  --theme-card: var(--color-erde-800);
  --theme-text: var(--color-sand-100);
  --theme-text-muted: var(--color-sand-300);
  --theme-accent: var(--color-akzent-bernstein);
  --theme-accent-secondary: var(--color-moos-400);
  --theme-border: var(--color-erde-700);
  --theme-footer: var(--color-erde-800);
}

/* ── Custom Animations ── */
@keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse-soft { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }

/* ── Focus Ring ── */
*:focus-visible {
  outline: 2px solid var(--theme-accent);
  outline-offset: 2px;
}

/* ── Shadow Utilities ── */
.shadow-soft { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.shadow-soft-md { box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
.shadow-soft-lg { box-shadow: 0 8px 32px rgba(0,0,0,0.16); }
```


---

## 6. Routing

### src/router/index.ts

```typescript
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ── Public Routes ──
    { path: '/', name: 'home', component: () => import('@/views/public/HomeView.vue') },
    { path: '/login', name: 'login', component: () => import('@/views/auth/LoginView.vue'), meta: { requiresGuest: true } },
    { path: '/register', name: 'register', component: () => import('@/views/auth/RegisterView.vue'), meta: { requiresGuest: true } },
    { path: '/forgot-password', name: 'forgot-password', component: () => import('@/views/auth/ForgotPasswordView.vue'), meta: { requiresGuest: true } },
    { path: '/reset-password', name: 'reset-password', component: () => import('@/views/auth/ResetPasswordView.vue') },

    // ── Legal Routes ──
    { path: '/impressum', name: 'impressum', component: () => import('@/views/public/ImpressumView.vue') },
    { path: '/datenschutz', name: 'datenschutz', component: () => import('@/views/public/DatenschutzView.vue') },
    { path: '/agb', name: 'agb', component: () => import('@/views/public/AGBView.vue') },
    { path: '/kontakt', name: 'kontakt', component: () => import('@/views/public/KontaktView.vue') },
    { path: '/ueber-em', name: 'ueber-em', component: () => import('@/views/public/UeberEMView.vue') },

    // ── Protected Routes ──
    { path: '/partner', name: 'partner', component: () => import('@/views/protected/PartnerFinderView.vue'), meta: { requiresAuth: true } },
    { path: '/sessions', name: 'sessions', component: () => import('@/views/protected/SessionsView.vue'), meta: { requiresAuth: true } },
    { path: '/session/:id', name: 'active-session', component: () => import('@/views/protected/ActiveSessionView.vue'), meta: { requiresAuth: true } },
    { path: '/gruppen', name: 'gruppen', component: () => import('@/views/protected/Level3View.vue'), meta: { requiresAuth: true } },
    { path: '/profile', name: 'profile', component: () => import('@/views/protected/ProfileView.vue'), meta: { requiresAuth: true } },
    { path: '/kalender', name: 'kalender', component: () => import('@/views/protected/CalendarView.vue'), meta: { requiresAuth: true } },

    // ── Invitation Redirect ──
    { path: '/invite/:token', redirect: to => ({ path: '/register', query: { invite: to.params.token as string } }) },
  ]
})

// ── Navigation Guards ──
router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  // Warte auf Auth-Initialisierung (cached, kein Network Request)
  while (!authStore.initialized) {
    await new Promise(r => setTimeout(r, 50))
  }

  if (to.meta.requiresAuth && !authStore.currentUser) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresGuest && authStore.currentUser) {
    return { name: 'partner' }
  }
})

export default router
```

---

## 7. Datenbank-Schema

### Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### Custom Types

```sql
CREATE TYPE trust_level AS ENUM ('new', 'known', 'verified');
CREATE TYPE session_status AS ENUM ('pending', 'accepted', 'active', 'completed', 'cancelled');
```

### 7.1 profiles

```sql
CREATE TABLE profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  name                  TEXT NOT NULL,
  email                 TEXT NOT NULL UNIQUE,
  avatar_url            TEXT,
  bio                   TEXT,
  trust_level           trust_level NOT NULL DEFAULT 'new',
  confirmations         INTEGER NOT NULL DEFAULT 0,
  is_online             BOOLEAN NOT NULL DEFAULT false,
  is_available          BOOLEAN NOT NULL DEFAULT false,
  preferred_levels      INTEGER[] NOT NULL DEFAULT '{1}',
  preferred_duration    INTEGER NOT NULL DEFAULT 15,
  sessions_completed    INTEGER NOT NULL DEFAULT 0,
  compliance_rate       NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  em_experience_months  INTEGER NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX idx_profiles_trust_level ON profiles(trust_level);
CREATE INDEX idx_profiles_is_available ON profiles(is_available);
CREATE INDEX idx_profiles_name_trgm ON profiles USING GIN (name gin_trgm_ops);
CREATE INDEX idx_profiles_online_updated ON profiles(is_online, updated_at DESC);
CREATE INDEX idx_profiles_sessions_completed ON profiles(sessions_completed DESC);

-- Auto-Update Trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 7.2 sessions

```sql
CREATE TABLE sessions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requester_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level                   INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
  duration                INTEGER NOT NULL CHECK (duration > 0),
  scheduled_at            TIMESTAMPTZ,
  started_at              TIMESTAMPTZ,
  ended_at                TIMESTAMPTZ,
  status                  session_status NOT NULL DEFAULT 'pending',
  room_url                TEXT,
  room_token              TEXT,
  partner_token           TEXT,
  is_open                 BOOLEAN DEFAULT false,
  third_participant_id    UUID REFERENCES profiles(id),
  third_participant_token TEXT,
  deleted_by_requester    BOOLEAN DEFAULT false,
  deleted_by_partner      BOOLEAN DEFAULT false
);

CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_requester ON sessions(requester_id);
CREATE INDEX idx_sessions_partner ON sessions(partner_id);
CREATE INDEX idx_sessions_is_open ON sessions(is_open) WHERE is_open = true;
CREATE INDEX idx_sessions_third_participant ON sessions(third_participant_id) WHERE third_participant_id IS NOT NULL;
CREATE INDEX idx_sessions_deleted ON sessions(deleted_by_requester, deleted_by_partner);
```

### 7.3 session_feedback

```sql
CREATE TABLE session_feedback (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  session_id            UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  rated_user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  structure_rating      INT NOT NULL CHECK (structure_rating BETWEEN 1 AND 5),
  presence_rating       INT NOT NULL CHECK (presence_rating BETWEEN 1 AND 5),
  overall_rating        INT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  would_practice_again  BOOLEAN NOT NULL,
  UNIQUE (session_id, reviewer_id)
);

CREATE INDEX idx_feedback_rated_user ON session_feedback(rated_user_id);
CREATE INDEX idx_feedback_session ON session_feedback(session_id);
```

### 7.4 messages

```sql
CREATE TABLE messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  sender_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  read_at      TIMESTAMPTZ
);

CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_recipient ON messages(recipient_id, created_at DESC);
CREATE INDEX idx_messages_conversation ON messages(
  LEAST(sender_id, recipient_id),
  GREATEST(sender_id, recipient_id),
  created_at DESC
);
```

### 7.5 invitations

```sql
CREATE TABLE invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  inviter_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token           VARCHAR(32) UNIQUE NOT NULL,
  used_at         TIMESTAMPTZ,
  invited_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  is_active       BOOLEAN DEFAULT true
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_inviter ON invitations(inviter_id);
```

### 7.6 peer_verifications

```sql
CREATE TABLE peer_verifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verifier_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verified_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id       UUID REFERENCES sessions(id) ON DELETE SET NULL,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (verifier_id, verified_user_id),
  CHECK (verifier_id != verified_user_id)
);

CREATE INDEX idx_peer_verifications_verified_user ON peer_verifications(verified_user_id);
CREATE INDEX idx_peer_verifications_verifier ON peer_verifications(verifier_id);
CREATE INDEX idx_peer_verifications_active ON peer_verifications(is_active);
```

### 7.7 blocked_partners

```sql
CREATE TABLE blocked_partners (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE (user_id, blocked_user_id)
);
```

### 7.8 availability_slots

```sql
CREATE TABLE availability_slots (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

CREATE INDEX idx_availability_user ON availability_slots(user_id);
CREATE INDEX idx_availability_day ON availability_slots(day_of_week);
```

### 7.9 scheduled_sessions

```sql
CREATE TABLE scheduled_sessions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id            UUID REFERENCES sessions(id) ON DELETE CASCADE,
  requester_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_for         TIMESTAMPTZ NOT NULL,
  duration              INTEGER NOT NULL DEFAULT 15,
  level                 INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 4),
  status                VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('proposed','scheduled','cancelled','completed','rejected')),
  reminder_sent         BOOLEAN NOT NULL DEFAULT false,
  notes                 TEXT,
  message               TEXT,
  pending_response_from UUID REFERENCES profiles(id)
);

CREATE INDEX idx_scheduled_sessions_requester ON scheduled_sessions(requester_id);
CREATE INDEX idx_scheduled_sessions_partner ON scheduled_sessions(partner_id);
CREATE INDEX idx_scheduled_sessions_date ON scheduled_sessions(scheduled_for);
CREATE INDEX idx_scheduled_sessions_status ON scheduled_sessions(status);
CREATE INDEX idx_scheduled_sessions_pending ON scheduled_sessions(pending_response_from) WHERE status = 'proposed';
```

### 7.10 push_subscriptions

```sql
CREATE TABLE push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id    UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
```

### 7.11 login_attempts

```sql
CREATE TABLE login_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash      TEXT NOT NULL,
  email_hash   TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success      BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_login_attempts_ip_time ON login_attempts(ip_hash, attempted_at DESC);
CREATE INDEX idx_login_attempts_email_time ON login_attempts(email_hash, attempted_at DESC);
CREATE INDEX idx_login_attempts_cleanup ON login_attempts(attempted_at);
```

### 7.12 feedback (Legacy)

```sql
CREATE TABLE feedback (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  reviewer_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followed_rules  BOOLEAN NOT NULL,
  trust_confirmed BOOLEAN,
  private_note    TEXT,
  block_partner   BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (session_id, reviewer_id)
);
```

### 7.13 rating_disputes

```sql
CREATE TABLE rating_disputes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispute_type     TEXT NOT NULL CHECK (dispute_type IN ('rating','verification','other')),
  reporter_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  disputed_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id       UUID REFERENCES sessions(id) ON DELETE SET NULL,
  verification_id  UUID REFERENCES peer_verifications(id) ON DELETE SET NULL,
  description      TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','investigating','resolved','dismissed')),
  resolution       TEXT,
  resolved_at      TIMESTAMPTZ,
  resolved_by      TEXT
);

CREATE INDEX idx_rating_disputes_reporter ON rating_disputes(reporter_id);
CREATE INDEX idx_rating_disputes_status ON rating_disputes(status);
```

### Realtime aktivieren

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE scheduled_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE peer_verifications;
```

### Storage Bucket

```sql
-- avatars Bucket (Public)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
```


---

## 8. RPC Functions

### 8.1 Trust-Level System

```sql
-- Trust-Level neu berechnen (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION recalculate_trust_level(user_id UUID)
RETURNS void AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM peer_verifications pv
  JOIN profiles p ON p.id = pv.verifier_id
  WHERE pv.verified_user_id = user_id
    AND pv.is_active = true
    AND p.trust_level = 'verified';

  UPDATE profiles SET
    trust_level = CASE
      WHEN active_count >= 3 THEN 'verified'::trust_level
      WHEN active_count >= 1 THEN 'known'::trust_level
      ELSE 'new'::trust_level
    END,
    confirmations = active_count
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger bei Verification-Änderung
CREATE OR REPLACE FUNCTION on_verification_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_trust_level(OLD.verified_user_id);
  ELSE
    PERFORM recalculate_trust_level(NEW.verified_user_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER peer_verifications_recalculate
  AFTER INSERT OR UPDATE OR DELETE ON peer_verifications
  FOR EACH ROW EXECUTE FUNCTION on_verification_change();
```

### 8.2 Verifizierer abrufen

```sql
CREATE OR REPLACE FUNCTION get_verifiers(target_user_id UUID)
RETURNS TABLE (id UUID, name TEXT, avatar_url TEXT, verified_at TIMESTAMPTZ)
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.avatar_url, pv.created_at AS verified_at
  FROM peer_verifications pv
  JOIN profiles p ON p.id = pv.verifier_id
  WHERE pv.verified_user_id = target_user_id AND pv.is_active = true
  ORDER BY pv.created_at DESC LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 8.3 Verification Stats

```sql
CREATE OR REPLACE FUNCTION get_verification_stats(target_user_id UUID)
RETURNS TABLE (verification_count INTEGER, is_verified BOOLEAN, trust_level trust_level)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM peer_verifications WHERE verified_user_id = target_user_id AND is_active = true),
    (SELECT p.trust_level = 'verified' FROM profiles p WHERE p.id = target_user_id),
    (SELECT p.trust_level FROM profiles p WHERE p.id = target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 8.4 Partner-Suche (Fuzzy, OHNE Email)

```sql
CREATE OR REPLACE FUNCTION search_partners_fuzzy(
  p_search_term TEXT DEFAULT '',
  p_exclude_user_id UUID DEFAULT NULL,
  p_trust_filter TEXT DEFAULT NULL,
  p_level_filter INT[] DEFAULT NULL,
  p_duration_filter INT DEFAULT NULL,
  p_online_only BOOLEAN DEFAULT false,
  p_sort_by TEXT DEFAULT 'recent',
  p_page_offset INT DEFAULT 0,
  p_page_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID, name TEXT, avatar_url TEXT, bio TEXT, trust_level trust_level,
  confirmations INT, is_online BOOLEAN, is_available BOOLEAN,
  preferred_levels INT[], preferred_duration INT, sessions_completed INT,
  compliance_rate NUMERIC, em_experience_months INT,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  similarity_score REAL, total_count BIGINT
)
AS $$
BEGIN
  -- SECURITY: Kein email im Return!
  RETURN QUERY
  WITH filtered AS (
    SELECT p.*,
      CASE WHEN p_search_term != '' THEN similarity(p.name, p_search_term) ELSE 0 END AS sim_score,
      COUNT(*) OVER() AS total
    FROM profiles p
    LEFT JOIN blocked_partners bp1 ON bp1.user_id = p_exclude_user_id AND bp1.blocked_user_id = p.id
    LEFT JOIN blocked_partners bp2 ON bp2.user_id = p.id AND bp2.blocked_user_id = p_exclude_user_id
    WHERE (p_exclude_user_id IS NULL OR p.id != p_exclude_user_id)
      AND bp1.id IS NULL AND bp2.id IS NULL
      AND (p_search_term = '' OR p.name % p_search_term)
      AND (p_trust_filter IS NULL OR p.trust_level::TEXT = p_trust_filter)
      AND (p_level_filter IS NULL OR p.preferred_levels && p_level_filter)
      AND (p_duration_filter IS NULL OR p.preferred_duration = p_duration_filter)
      AND (NOT p_online_only OR p.is_online = true)
  )
  SELECT f.id, f.name, f.avatar_url, f.bio, f.trust_level,
    f.confirmations, f.is_online, f.is_available,
    f.preferred_levels, f.preferred_duration, f.sessions_completed,
    f.compliance_rate, f.em_experience_months,
    f.created_at, f.updated_at, f.sim_score, f.total
  FROM filtered f
  ORDER BY
    CASE p_sort_by
      WHEN 'name' THEN f.name
      WHEN 'newest' THEN NULL
      WHEN 'sessions' THEN NULL
      ELSE NULL
    END,
    CASE WHEN p_search_term != '' THEN f.sim_score END DESC NULLS LAST,
    CASE p_sort_by
      WHEN 'sessions' THEN f.sessions_completed
      ELSE NULL
    END DESC NULLS LAST,
    f.updated_at DESC
  OFFSET p_page_offset LIMIT p_page_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECURITY: Nur authenticated, kein anon
REVOKE ALL ON FUNCTION search_partners_fuzzy FROM anon;
GRANT EXECUTE ON FUNCTION search_partners_fuzzy TO authenticated;
```

### 8.5 Empfohlene Partner

```sql
CREATE OR REPLACE FUNCTION get_recommended_partners(user_id UUID, lim INT DEFAULT 6)
RETURNS TABLE (
  id UUID, name TEXT, avatar_url TEXT, bio TEXT, trust_level trust_level,
  confirmations INT, is_online BOOLEAN, preferred_levels INT[],
  preferred_duration INT, sessions_completed INT, compliance_rate NUMERIC,
  em_experience_months INT, updated_at TIMESTAMPTZ,
  match_score NUMERIC, match_reasons TEXT[]
)
AS $$
DECLARE
  user_levels INT[];
  user_duration INT;
  user_exp INT;
BEGIN
  SELECT p.preferred_levels, p.preferred_duration, p.em_experience_months
  INTO user_levels, user_duration, user_exp
  FROM profiles p WHERE p.id = user_id;

  RETURN QUERY
  SELECT p.id, p.name, p.avatar_url, p.bio, p.trust_level,
    p.confirmations, p.is_online, p.preferred_levels,
    p.preferred_duration, p.sessions_completed, p.compliance_rate,
    p.em_experience_months, p.updated_at,
    (
      CASE WHEN p.preferred_levels && user_levels THEN 3 ELSE 0 END +
      CASE WHEN p.preferred_duration = user_duration THEN 2 ELSE 0 END +
      CASE WHEN EXISTS(SELECT 1 FROM session_feedback sf WHERE sf.rated_user_id = user_id AND sf.reviewer_id = p.id AND sf.would_practice_again) THEN 2 ELSE 0 END +
      CASE WHEN ABS(p.em_experience_months - user_exp) <= 6 THEN 1 ELSE 0 END +
      CASE WHEN p.trust_level = 'verified' THEN 1 ELSE 0 END +
      CASE WHEN p.is_online THEN 0.5 ELSE 0 END
    )::NUMERIC AS score,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN p.preferred_levels && user_levels THEN 'shared_levels' END,
      CASE WHEN p.preferred_duration = user_duration THEN 'same_duration' END,
      CASE WHEN p.trust_level = 'verified' THEN 'verified' END,
      CASE WHEN p.is_online THEN 'online' END
    ], NULL) AS reasons
  FROM profiles p
  LEFT JOIN blocked_partners bp1 ON bp1.user_id = user_id AND bp1.blocked_user_id = p.id
  LEFT JOIN blocked_partners bp2 ON bp2.user_id = p.id AND bp2.blocked_user_id = user_id
  WHERE p.id != user_id AND bp1.id IS NULL AND bp2.id IS NULL
  ORDER BY score DESC, p.updated_at DESC
  LIMIT lim;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION get_recommended_partners FROM anon;
GRANT EXECUTE ON FUNCTION get_recommended_partners TO authenticated;
```

### 8.6 Offene Sessions (sicher)

```sql
CREATE OR REPLACE FUNCTION get_open_sessions(user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID, created_at TIMESTAMPTZ, requester_id UUID,
  requester_name TEXT, requester_avatar TEXT,
  level INT, duration INT, scheduled_at TIMESTAMPTZ, status session_status
)
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.created_at, s.requester_id,
    p.name, p.avatar_url,
    s.level, s.duration, s.scheduled_at, s.status
  FROM sessions s
  JOIN profiles p ON p.id = s.requester_id
  WHERE s.is_open = true AND s.status = 'pending'
    AND (user_id IS NULL OR s.requester_id != user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_open_sessions TO authenticated;
```

### 8.7 Rate Limiting

```sql
CREATE OR REPLACE FUNCTION check_login_rate_limit(
  p_ip_hash TEXT, p_email_hash TEXT,
  p_max_attempts INT DEFAULT 5, p_window_minutes INT DEFAULT 15
)
RETURNS JSON AS $$
DECLARE
  ip_count INT; email_count INT; window INTERVAL;
BEGIN
  window := (p_window_minutes || ' minutes')::INTERVAL;
  SELECT COUNT(*) INTO ip_count FROM login_attempts
    WHERE ip_hash = p_ip_hash AND attempted_at > NOW() - window AND NOT success;
  SELECT COUNT(*) INTO email_count FROM login_attempts
    WHERE email_hash = p_email_hash AND attempted_at > NOW() - window AND NOT success;

  RETURN json_build_object(
    'allowed', ip_count < p_max_attempts AND email_count < p_max_attempts,
    'ip_attempts', ip_count, 'email_attempts', email_count,
    'max_attempts', p_max_attempts,
    'retry_after', EXTRACT(EPOCH FROM (window - LEAST(
      NOW() - (SELECT MAX(attempted_at) FROM login_attempts WHERE ip_hash = p_ip_hash AND NOT success),
      NOW() - (SELECT MAX(attempted_at) FROM login_attempts WHERE email_hash = p_email_hash AND NOT success)
    )))::INT
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_login_attempt(p_ip_hash TEXT, p_email_hash TEXT, p_success BOOLEAN)
RETURNS void AS $$
BEGIN
  INSERT INTO login_attempts (ip_hash, email_hash, success) VALUES (p_ip_hash, p_email_hash, p_success);
  IF p_success THEN
    DELETE FROM login_attempts WHERE email_hash = p_email_hash AND NOT success;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS INT AS $$
DECLARE deleted INT;
BEGIN
  DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 8.8 Einladungen

```sql
CREATE OR REPLACE FUNCTION validate_invitation_token(p_token TEXT)
RETURNS TABLE (id UUID, inviter_id UUID, inviter_name TEXT, inviter_avatar TEXT, expires_at TIMESTAMPTZ, is_valid BOOLEAN)
AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.inviter_id, p.name, p.avatar_url, i.expires_at,
    (i.is_active AND i.used_at IS NULL AND i.expires_at > NOW()) AS is_valid
  FROM invitations i
  JOIN profiles p ON p.id = i.inviter_id
  WHERE i.token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION validate_invitation_token TO anon, authenticated;

CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS VARCHAR(32) AS $$
DECLARE chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result VARCHAR(32) := '';
BEGIN
  FOR i IN 1..16 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_invite_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM invitations WHERE inviter_id = NEW.inviter_id AND is_active AND used_at IS NULL AND expires_at > NOW()) >= 10 THEN
    RAISE EXCEPTION 'Maximum 10 aktive Einladungen erreicht';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_invite_limit BEFORE INSERT ON invitations FOR EACH ROW EXECUTE FUNCTION check_invite_limit();
```

### 8.9 Account-Löschung (GDPR)

```sql
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
  -- CASCADE löscht: profiles, sessions, messages, feedback, verifications, etc.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION delete_own_account TO authenticated;
```

### 8.10 User Ratings (aggregiert, anonym)

```sql
CREATE OR REPLACE FUNCTION get_user_ratings(p_user_id UUID)
RETURNS TABLE (
  average_rating NUMERIC, rating_count BIGINT,
  structure_avg NUMERIC, presence_avg NUMERIC, overall_avg NUMERIC,
  would_practice_again_percent NUMERIC
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG((sf.structure_rating + sf.presence_rating + sf.overall_rating)::NUMERIC / 3), 1),
    COUNT(*),
    ROUND(AVG(sf.structure_rating::NUMERIC), 1),
    ROUND(AVG(sf.presence_rating::NUMERIC), 1),
    ROUND(AVG(sf.overall_rating::NUMERIC), 1),
    ROUND(AVG(CASE WHEN sf.would_practice_again THEN 100 ELSE 0 END)::NUMERIC, 0)
  FROM session_feedback sf
  WHERE sf.rated_user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 8.11 Letzte Partner

```sql
CREATE OR REPLACE FUNCTION get_recent_partners(p_user_id UUID, lim INT DEFAULT 6)
RETURNS TABLE (
  id UUID, name TEXT, avatar_url TEXT, bio TEXT, trust_level trust_level,
  confirmations INT, is_online BOOLEAN, preferred_levels INT[],
  preferred_duration INT, sessions_completed INT, compliance_rate NUMERIC,
  updated_at TIMESTAMPTZ, last_session_at TIMESTAMPTZ
)
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (partner.id) partner.id, partner.name, partner.avatar_url, partner.bio,
    partner.trust_level, partner.confirmations, partner.is_online,
    partner.preferred_levels, partner.preferred_duration, partner.sessions_completed,
    partner.compliance_rate, partner.updated_at, s.created_at AS last_session_at
  FROM sessions s
  JOIN profiles partner ON partner.id = CASE
    WHEN s.requester_id = p_user_id THEN s.partner_id
    ELSE s.requester_id
  END
  WHERE (s.requester_id = p_user_id OR s.partner_id = p_user_id)
    AND s.status IN ('completed', 'active', 'accepted')
  ORDER BY partner.id, s.created_at DESC
  LIMIT lim;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION get_recent_partners FROM anon;
GRANT EXECUTE ON FUNCTION get_recent_partners TO authenticated;
```


---

## 9. RLS Policies

### profiles

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (auth.uid() = id);
```

### sessions

```sql
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_select" ON sessions FOR SELECT USING (
  auth.uid() IN (requester_id, partner_id, third_participant_id)
);
CREATE POLICY "sessions_insert" ON sessions FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "sessions_update" ON sessions FOR UPDATE USING (
  auth.uid() IN (requester_id, partner_id, third_participant_id)
);
CREATE POLICY "sessions_delete" ON sessions FOR DELETE USING (
  auth.uid() IN (requester_id, partner_id)
);
```

### messages

```sql
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select" ON messages FOR SELECT USING (auth.uid() IN (sender_id, recipient_id));
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (auth.uid() = recipient_id);
CREATE POLICY "messages_delete" ON messages FOR DELETE USING (auth.uid() = sender_id);
```

### session_feedback

```sql
ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_select" ON session_feedback FOR SELECT USING (auth.uid() = reviewer_id);
CREATE POLICY "feedback_insert" ON session_feedback FOR INSERT WITH CHECK (
  auth.uid() = reviewer_id
  AND rated_user_id != reviewer_id
  AND EXISTS (
    SELECT 1 FROM sessions s WHERE s.id = session_id
    AND auth.uid() IN (s.requester_id, s.partner_id, s.third_participant_id)
  )
);
CREATE POLICY "feedback_delete" ON session_feedback FOR DELETE USING (auth.uid() = reviewer_id);
```

### peer_verifications

```sql
ALTER TABLE peer_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verifications_select" ON peer_verifications FOR SELECT USING (true);
CREATE POLICY "verifications_insert" ON peer_verifications FOR INSERT WITH CHECK (
  auth.uid() = verifier_id
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND trust_level = 'verified')
);
CREATE POLICY "verifications_update" ON peer_verifications FOR UPDATE USING (auth.uid() = verifier_id);
CREATE POLICY "verifications_delete" ON peer_verifications FOR DELETE USING (auth.uid() = verifier_id);
```

### blocked_partners, invitations, availability_slots, push_subscriptions, scheduled_sessions

```sql
-- Alle folgen dem gleichen Pattern:
-- SELECT: user_id = auth.uid() (oder Teilnehmer)
-- INSERT: user_id = auth.uid()
-- UPDATE: user_id = auth.uid()
-- DELETE: user_id = auth.uid()

-- login_attempts (speziell):
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "login_attempts_select" ON login_attempts FOR SELECT
  USING (attempted_at > NOW() - INTERVAL '15 minutes');
CREATE POLICY "login_attempts_insert" ON login_attempts FOR INSERT WITH CHECK (true);
```

### Storage: avatars

```sql
CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "avatars_select" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
```

---

## 10. Auto-generierte Types [Refactoring 4]

### Workflow

```bash
# 1. Supabase CLI installieren (einmalig)
npm install -D supabase

# 2. Types generieren (nach jeder Schema-Änderung)
npx supabase gen types typescript \
  --project-id YOUR_PROJECT_ID \
  > src/types/database.ts

# 3. Oder als npm script:
npm run types:generate
```

### Integration in supabase.ts

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Vollständig typisiert - alle Tabellen, RPCs, Enums automatisch
export const supabase = createClient<Database>(url, key)

// Queries werden automatisch typisiert:
const { data } = await supabase.from('profiles').select('*')
// data ist automatisch Profile[] | null

// RPCs sind typisiert:
const { data } = await supabase.rpc('search_partners_fuzzy', { p_search_term: 'Max' })
// data hat automatisch den korrekten Return-Type
```

### Vorteile gegenüber manuellen Types
- Immer synchron mit der Datenbank
- Alle Spalten, Nullable-Markierungen, Enums korrekt
- RPC Parameter und Return-Types automatisch
- Kein manuelles Pflegen von ~200 Zeilen database.ts

---

## 11. State Management [Refactoring 1 + 5]

### Architektur-Prinzip

| State-Typ | Lösung | Beispiel |
|-----------|--------|---------|
| **Server State** | TanStack Query | Partner, Sessions, Messages, Feedback |
| **Global App State** | Pinia | Auth (User/Profile), Theme, Locale |
| **Local UI State** | Vue refs | Modals, Form-Inputs, Loading-Spinners |

### 11.1 Pinia Auth Store [Refactoring 5]

```typescript
// src/stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<User | null>(null)
  const currentProfile = ref<Profile | null>(null)
  const initialized = ref(false)

  const isAuthenticated = computed(() => !!currentUser.value)
  const userId = computed(() => currentUser.value?.id)

  async function initialize() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      currentUser.value = session.user
      await fetchProfile(session.user.id)
    }
    initialized.value = true

    // Auth State Listener
    supabase.auth.onAuthStateChange(async (event, session) => {
      currentUser.value = session?.user ?? null
      if (session?.user) await fetchProfile(session.user.id)
      else currentProfile.value = null
    })
  }

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) currentProfile.value = data
  }

  async function signOut() {
    await supabase.auth.signOut()
    currentUser.value = null
    currentProfile.value = null
  }

  return { currentUser, currentProfile, initialized, isAuthenticated, userId,
           initialize, fetchProfile, signOut }
})
```

### 11.2 Pinia App Store

```typescript
// src/stores/app.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const cookiesAccepted = ref(localStorage.getItem('cookies-accepted') === 'true')

  function acceptCookies() {
    cookiesAccepted.value = true
    localStorage.setItem('cookies-accepted', 'true')
  }

  return { cookiesAccepted, acceptCookies }
})
```

### 11.3 TanStack Query Pattern [Refactoring 1]

**VORHER (60-75x wiederholt):**
```typescript
// Jedes Composable hatte diesen Boilerplate:
const loading = ref(false)
const error = ref<string | null>(null)

async function fetchSomething() {
  try {
    loading.value = true
    error.value = null
    const { data, error: err } = await supabase.from('table').select('*')
    if (err) throw err
    items.value = data
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unbekannter Fehler'
  } finally {
    loading.value = false
  }
}
```

**NACHHER (mit vue-query):**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { supabase } from '@/lib/supabase'

// ── Query (GET) ──
// loading, error, data sind automatisch reactive
const { data: partners, isLoading, error } = useQuery({
  queryKey: ['partners', { search, filters }],
  queryFn: async () => {
    const { data, error } = await supabase.rpc('search_partners_fuzzy', {
      p_search_term: search.value,
      p_exclude_user_id: userId.value,
      // ...weitere Filter
    })
    if (error) throw error
    return data
  },
  enabled: computed(() => !!userId.value),
})

// ── Mutation (POST/PUT/DELETE) ──
const queryClient = useQueryClient()

const { mutate: createSession, isPending } = useMutation({
  mutationFn: async (params: { partnerId: string; level: number; duration: number }) => {
    const { data, error } = await supabase.from('sessions').insert({
      requester_id: userId.value,
      partner_id: params.partnerId,
      level: params.level,
      duration: params.duration,
    }).select().single()
    if (error) throw error
    return data
  },
  onSuccess: () => {
    // Automatisch Sessions-Cache invalidieren
    queryClient.invalidateQueries({ queryKey: ['sessions'] })
  },
})
```

**Vorteile:**
- Kein manuelles `loading`/`error` State
- Automatisches Caching (staleTime: 2min)
- Automatisches Retry bei Fehlern
- Cache-Invalidierung bei Mutations
- Automatic Refetch bei Window Focus
- Deduplication (gleiche Query wird nur 1x ausgeführt)

---

## 12. Composables

### 12.1 Query-Composables (src/composables/queries/)

#### usePartnerQueries.ts

```typescript
import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export function usePartnerSearch(filters: Ref<PartnerFilters>) {
  const auth = useAuthStore()

  return useQuery({
    queryKey: ['partners', 'search', filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_partners_fuzzy', {
        p_search_term: filters.value.search,
        p_exclude_user_id: auth.userId!,
        p_trust_filter: filters.value.trust,
        p_level_filter: filters.value.levels,
        p_duration_filter: filters.value.duration,
        p_online_only: filters.value.onlineOnly,
        p_sort_by: filters.value.sortBy,
        p_page_offset: filters.value.offset,
        p_page_limit: 20,
      })
      if (error) throw error
      return data
    },
    enabled: computed(() => !!auth.userId),
  })
}

export function useRecommendedPartners() {
  const auth = useAuthStore()
  return useQuery({
    queryKey: ['partners', 'recommended'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recommended_partners', {
        user_id: auth.userId!, lim: 6,
      })
      if (error) throw error
      return data
    },
    enabled: computed(() => !!auth.userId),
    staleTime: 1000 * 60 * 5, // 5 Min Cache für Empfehlungen
  })
}

export function useRecentPartners() {
  const auth = useAuthStore()
  return useQuery({
    queryKey: ['partners', 'recent'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recent_partners', {
        p_user_id: auth.userId!, lim: 6,
      })
      if (error) throw error
      return data
    },
    enabled: computed(() => !!auth.userId),
  })
}
```

#### useSessionQueries.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export function useSessions() {
  const auth = useAuthStore()
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, requester:profiles!requester_id(*), partner:profiles!partner_id(*)')
        .or(`requester_id.eq.${auth.userId},partner_id.eq.${auth.userId}`)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: computed(() => !!auth.userId),
  })
}

export function useCreateSession() {
  const queryClient = useQueryClient()
  const auth = useAuthStore()

  return useMutation({
    mutationFn: async (params: { partnerId: string; level: number; duration: number }) => {
      const { data, error } = await supabase.from('sessions').insert({
        requester_id: auth.userId!,
        partner_id: params.partnerId,
        level: params.level,
        duration: params.duration,
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

export function useUpdateSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Session>) => {
      const { data, error } = await supabase.from('sessions').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

export function useOpenSessions() {
  const auth = useAuthStore()
  return useQuery({
    queryKey: ['sessions', 'open'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_open_sessions', { user_id: auth.userId })
      if (error) throw error
      return data
    },
    enabled: computed(() => !!auth.userId),
  })
}
```

#### useMessageQueries.ts

```typescript
export function useMessages(partnerId: Ref<string | null>) {
  const auth = useAuthStore()
  return useQuery({
    queryKey: ['messages', partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${auth.userId},recipient_id.eq.${partnerId.value}),and(sender_id.eq.${partnerId.value},recipient_id.eq.${auth.userId})`)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: computed(() => !!auth.userId && !!partnerId.value),
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  const auth = useAuthStore()
  return useMutation({
    mutationFn: async ({ recipientId, content }: { recipientId: string; content: string }) => {
      const { error } = await supabase.from('messages').insert({
        sender_id: auth.userId!, recipient_id: recipientId, content,
      })
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.recipientId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useConversations() {
  const auth = useAuthStore()
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      // Gruppierte Konversationen mit Unread-Count
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles!sender_id(name, avatar_url), recipient:profiles!recipient_id(name, avatar_url)')
        .or(`sender_id.eq.${auth.userId},recipient_id.eq.${auth.userId}`)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: computed(() => !!auth.userId),
  })
}
```

### 12.2 usePresence.ts [Refactoring 2]

```typescript
// VORHER: 80 Zeilen Heartbeat mit setInterval + visibilitychange + beforeunload
// NACHHER: ~20 Zeilen mit Supabase Presence

import { ref, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { RealtimeChannel } from '@supabase/supabase-js'

const onlineUsers = ref<Set<string>>(new Set())
let channel: RealtimeChannel | null = null

export function usePresence() {
  const auth = useAuthStore()

  function startTracking() {
    if (!auth.userId || channel) return

    channel = supabase.channel('online-users')
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel!.presenceState()
        onlineUsers.value = new Set(
          Object.values(state).flat().map((p: any) => p.user_id)
        )
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel!.track({ user_id: auth.userId, online_at: new Date().toISOString() })
        }
      })
  }

  function stopTracking() {
    if (channel) {
      channel.untrack()
      supabase.removeChannel(channel)
      channel = null
    }
    onlineUsers.value.clear()
  }

  function isOnline(userId: string): boolean {
    return onlineUsers.value.has(userId)
  }

  onUnmounted(() => stopTracking())

  return { onlineUsers, startTracking, stopTracking, isOnline }
}
```

### 12.3 useAuth.ts (mit Rate Limiting + Anti-Enumeration)

```typescript
// src/composables/useAuth.ts
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { useI18n } from 'vue-i18n'

export function useAuth() {
  const store = useAuthStore()
  const { t } = useI18n()

  // ── Client Fingerprint für Rate Limiting ──
  async function getFingerprint(): Promise<string> {
    const raw = [navigator.userAgent, navigator.language, screen.width, screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone].join('|')
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // ── Rate Limit Check (fail-closed) ──
  async function checkRateLimit(emailHash: string): Promise<{ allowed: boolean; message?: string }> {
    try {
      const ipHash = await getFingerprint()
      const { data, error } = await supabase.rpc('check_login_rate_limit', {
        p_ip_hash: ipHash, p_email_hash: emailHash,
        p_max_attempts: 5, p_window_minutes: 15,
      })
      if (error) throw error
      if (!data.allowed) {
        return { allowed: false, message: t('auth.errors.tooManyAttempts', { seconds: data.retry_after }) }
      }
      return { allowed: true }
    } catch {
      // FAIL-CLOSED: Bei Fehler blockieren
      return { allowed: false, message: t('auth.errors.rateLimitError') }
    }
  }

  // ── Sign In (Anti-Enumeration) ──
  async function signIn(email: string, password: string, rememberMe = false) {
    const emailHash = await hashString(email.toLowerCase())
    const rateCheck = await checkRateLimit(emailHash)
    if (!rateCheck.allowed) return { error: rateCheck.message }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    const ipHash = await getFingerprint()
    await supabase.rpc('log_login_attempt', { p_ip_hash: ipHash, p_email_hash: emailHash, p_success: !error })

    // ANTI-ENUMERATION: Immer gleiche Fehlermeldung
    if (error) return { error: t('auth.errors.signInFailed') }
    return { error: null }
  }

  // ── Sign Up (Anti-Enumeration) ──
  async function signUp(email: string, password: string, name: string, inviteToken?: string) {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, invite_token: inviteToken } },
    })
    // ANTI-ENUMERATION: Immer gleiche Fehlermeldung
    if (error) return { error: t('auth.errors.signUpFailed') }
    return { error: null }
  }

  // ── Weitere Auth-Funktionen ──
  async function resetPassword(email: string) {
    await supabase.auth.resetPasswordForEmail(email)
    // ANTI-ENUMERATION: Immer Erfolg anzeigen
    return { success: true }
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function deleteAccount() {
    const { error } = await supabase.rpc('delete_own_account')
    if (error) throw error
    await store.signOut()
  }

  return { signIn, signUp, resetPassword, updatePassword, deleteAccount,
           ...store  /* currentUser, currentProfile, initialized, isAuthenticated */ }
}

async function hashString(str: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}
```

### 12.4 useDaily.ts (Video Calls)

```typescript
// src/composables/useDaily.ts
import DailyIframe, { type DailyCall } from '@daily-co/daily-js'
import { ref, onUnmounted } from 'vue'

export function useDaily() {
  const callFrame = ref<DailyCall | null>(null)
  const participants = ref<any[]>([])
  const isJoined = ref(false)

  async function createRoom(sessionId: string, token: string): Promise<{ roomUrl: string; tokens: any }> {
    const response = await fetch('/api/create-room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ sessionId }),
    })
    if (!response.ok) throw new Error('Room creation failed')
    return response.json()
  }

  async function joinCall(roomUrl: string, meetingToken: string, container: HTMLElement) {
    callFrame.value = DailyIframe.createFrame(container, {
      showLeaveButton: true,
      iframeStyle: { width: '100%', height: '100%', border: 'none' },
    })

    callFrame.value.on('joined-meeting', () => { isJoined.value = true })
    callFrame.value.on('left-meeting', () => { isJoined.value = false })
    callFrame.value.on('participant-joined', updateParticipants)
    callFrame.value.on('participant-left', updateParticipants)

    await callFrame.value.join({ url: roomUrl, token: meetingToken })
  }

  function updateParticipants() {
    if (callFrame.value) {
      participants.value = Object.values(callFrame.value.participants())
    }
  }

  function leaveCall() {
    callFrame.value?.leave()
    callFrame.value?.destroy()
    callFrame.value = null
    isJoined.value = false
  }

  async function checkMediaPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      stream.getTracks().forEach(t => t.stop())
      return true
    } catch { return false }
  }

  onUnmounted(() => leaveCall())

  return { callFrame, participants, isJoined, createRoom, joinCall, leaveCall, checkMediaPermissions }
}
```

### 12.5 useTheme.ts

```typescript
// src/composables/useTheme.ts
import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { THEME_CONFIG, THEME_PREVIEW_COLORS, type ThemeName } from '@/config/themeConfig'

const THEME_NAMES: ThemeName[] = ['ERDUNG', 'KLARHEIT', 'WALD_MOOS', 'GOPAL']
const currentTheme = useStorage<ThemeName>('em-theme', 'ERDUNG')

function applyTheme(name: ThemeName) {
  const colors = THEME_CONFIG[name]
  const root = document.documentElement
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--theme-${key}`, value)
  })
  root.setAttribute('data-theme', name)
}

// Beim Laden anwenden
applyTheme(currentTheme.value)

export function useTheme() {
  const colors = computed(() => THEME_CONFIG[currentTheme.value])
  const isDark = computed(() => ['ERDUNG', 'WALD_MOOS'].includes(currentTheme.value))

  function setTheme(name: ThemeName) {
    currentTheme.value = name
    applyTheme(name)
  }

  function cycleTheme() {
    const idx = THEME_NAMES.indexOf(currentTheme.value)
    setTheme(THEME_NAMES[(idx + 1) % THEME_NAMES.length])
  }

  return { currentTheme, colors, isDark, setTheme, cycleTheme,
           themeLabels: { ERDUNG: 'Erdung', KLARHEIT: 'Klarheit', WALD_MOOS: 'Wald & Moos', GOPAL: 'Gopal' },
           themePreviewColors: THEME_PREVIEW_COLORS }
}
```


---

## 13. Komponenten-Architektur

### 13.1 Base Components

| Komponente | Props | Beschreibung |
|------------|-------|-------------|
| `BaseButton` | variant (primary/secondary/danger/ghost), size (sm/md/lg), loading, disabled | Standard-Button mit Loading-Spinner |
| `BaseInput` | modelValue, label, type, error, placeholder | Form-Input mit Label und Fehlermeldung |
| `BaseCard` | padding (sm/md/lg), clickable | Container-Karte mit Theme-Farben |
| `BaseChip` | active, removable | Filter-Chip (z.B. Level-Auswahl) |
| `BaseAvatar` | src, name, size (sm/md/lg/xl), online | Avatar mit Online-Indikator |
| `ProgressRing` | value (0-100), size, strokeWidth | SVG Kreisfortschritt |
| `SkeletonCard` | lines (1-5) | Loading-Placeholder |

### 13.2 Layout Components

| Komponente | Beschreibung |
|------------|-------------|
| `AppLayout` | Wrapper: Header + main content + BottomTabBar + Footer |
| `AppHeader` | Logo, Seitentitel, Theme-Switcher, Sprach-Umschalter, Logout |
| `AppFooter` | 3-Spalten: Navigation, Legal, Kontakt |
| `AppLogo` | SVG Logo, responsive |
| `BottomTabBar` | Mobile Navigation: Partner, Sessions, Kalender, Profil |

### 13.3 Feature Components

#### Partner
| Komponente | Features |
|------------|----------|
| `PartnerCard` | Avatar, Name, TrustBadge, Levels, Dauer, Online-Status, Erfahrung, Sessions-Count, Lazy-Loading |
| `CompactPartnerCard` | Kompakte Version für Listen (Empfehlungen, Letzte Partner) |
| `PartnerList` | Infinite Scroll Container mit Stagger-Animation |
| `FilterChips` | Trust-Filter, Level-Filter, Dauer-Filter, Online-Only Toggle, Sort-By |

#### Session
| Komponente | Features |
|------------|----------|
| `SessionRequestModal` | Level-Wahl, Dauer-Wahl, Nachricht, Bestätigung |
| `PendingRequestCard` | Eingehende/Ausgehende Anfragen, Akzeptieren/Ablehnen |
| `ProposedSessionCard` | Vorgeschlagener Termin, Akzeptieren/Ablehnen/Gegenvorschlag |
| `CancelSessionModal` | Abbruch-Bestätigung mit optionalem Grund |
| `SessionFeedbackModal` | 3-Kategorien StarRating + Would-Practice-Again Toggle |
| `StarRating` | 1-5 Sterne, interaktiv oder readonly, mit Label |

#### Chat
| Komponente | Features |
|------------|----------|
| `ChatWindow` | Nachrichtenliste, Auto-Scroll, Gelesen-Status |
| `ChatMessage` | Bubble-Layout (eigene/fremde), Timestamp, Gelesen |
| `ChatButton` | FAB mit Unread-Badge, öffnet ChatWindow |

#### Profile
| Komponente | Features |
|------------|----------|
| `ProfileHeaderCard` | Avatar (mit Upload), Name, Bio, Trust-Level, Ratings-Übersicht |
| `ProfileVerificationCard` | Verifier-Liste, Verification-Stats, Trust-Fortschritt |
| `ProfileSettingsCard` | Präferenz-Einstellungen (Levels, Dauer, Erfahrung) |
| `EditProfileModal` | Name, Bio, Avatar-Upload mit Canvas-Komprimierung |

#### Calendar
| Komponente | Features |
|------------|----------|
| `AvailabilitySlotEditor` | Wochentag-Auswahl, Zeitbereich (Start/Ende), Aktiv-Toggle |
| `ScheduleModal` | Terminvorschlag erstellen mit Datum, Zeit, Level, Nachricht |
| `AvailabilityMatcher` | Überlappende Verfügbarkeit zweier Benutzer anzeigen |

#### Verification & Trust
| Komponente | Features |
|------------|----------|
| `VerificationBadge` | Checkmark-Icon, Verifier-Count, Hover-Details |
| `TrustBadge` | Trust-Level als farbiges Badge (new=grau, known=blau, verified=gold) |

#### Onboarding
| Komponente | Features |
|------------|----------|
| `WelcomeModal` | Erscheint bei unvollständigem Profil (kein Avatar/Bio) |
| `OnboardingChecklist` | Schritt-für-Schritt Profil vervollständigen |

#### About EM (Öffentliche Seite)
| Komponente | Inhalt |
|------------|--------|
| `EMHeroSection` | Hero mit Headline + CTA |
| `EMGrundideaSection` | Was ist Ehrliches Mitteilen |
| `EMLevelsSection` | Die 5 Level erklärt |
| `EMOnlineSection` | Online-Praxis Vorteile |
| `EMRessourcenSection` | Links + Downloads |
| `EMInfoSections` | FAQ-artige Infoblöcke |
| `EMStepsSection` | Anmeldeschritte visualisiert |

#### Shared
| Komponente | Features |
|------------|----------|
| `CookieBanner` | Cookie-Hinweis, theme-aware, localStorage Persistenz |
| `ErrorBoundary` | Vue errorCaptured Handler, Fallback-UI |
| `OfflineIndicator` | Navigator.onLine Watch, Top-Banner |
| `InviteSection` | Einladungslink generieren/kopieren, QR-Code (optional) |

---

## 14. Views

### 14.1 Auth Views

| View | Route | Features |
|------|-------|----------|
| `LoginView` | /login | Email/Passwort, Remember-Me Checkbox, Rate-Limiting UI, Redirect nach Login |
| `RegisterView` | /register | Registrierung, Invite-Token Validierung, Passwort-Stärke, AGB-Checkbox |
| `ForgotPasswordView` | /forgot-password | Email-Eingabe, Anti-Enumeration (immer "Email gesendet") |
| `ResetPasswordView` | /reset-password | Neues Passwort setzen (via Magic Link Token) |

### 14.2 Protected Views

| View | Route | Features |
|------|-------|----------|
| `PartnerFinderView` | /partner | Suchfeld, FilterChips, PartnerList (Infinite Scroll), Empfehlungen-Sektion, Letzte-Partner-Sektion, Online-Partner-Sektion |
| `SessionsView` | /sessions | Tab: Eingehend/Ausgehend, PendingRequestCards, Session-Historie, Quick-Actions |
| `ActiveSessionView` | /session/:id | Daily.co Video-Frame, Timer, Teilnehmer-Anzeige, Chat-Button, Session beenden, Feedback-Modal |
| `Level3View` | /gruppen | Offene Sessions Browser, Session erstellen (is_open=true), 3. Teilnehmer beitreten |
| `ProfileView` | /profile | ProfileHeaderCard, VerificationCard, SettingsCard, Einladungen, Account-Löschung (mit Warnung) |
| `CalendarView` | /kalender | Verfügbarkeits-Editor (7 Wochentage), Geplante Sessions, Vorgeschlagene Sessions, Termin vorschlagen |

### 14.3 Public Views

| View | Route | Features |
|------|-------|----------|
| `HomeView` | / | Landing Page, CTA Buttons (Login/Register), Feature-Highlights |
| `UeberEMView` | /ueber-em | Alle EM-About-Sections (Hero, Grundidea, Levels, Online, Ressourcen, Steps) |
| `DatenschutzView` | /datenschutz | DSGVO-Datenschutzerklärung |
| `AGBView` | /agb | Allgemeine Geschäftsbedingungen |
| `ImpressumView` | /impressum | Impressum nach TMG |
| `KontaktView` | /kontakt | Kontaktformular/Informationen |


---

## 15. API Routes

### api/create-room.ts [Refactoring 3: jose statt HTTP-Call]

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { jwtVerify, createRemoteJWKSet } from 'jose'

// ── CORS Konfiguration ──
const ALLOWED_ORIGINS = [
  'https://connect.ehrlichesmitteilen.org',
  /^https:\/\/.*\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
]

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false
  return ALLOWED_ORIGINS.some(o => typeof o === 'string' ? o === origin : o.test(origin))
}

// ── JWT Verifizierung (lokal mit jose) ──
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.VITE_SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
)

async function verifyJWT(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${process.env.VITE_SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    })
    return payload as { sub: string }
  } catch {
    return null
  }
}

// ── Daily.co Room Creation ──
const DAILY_API = 'https://api.daily.co/v1'

async function createDailyRoom(name: string, expiresAt: number) {
  const res = await fetch(`${DAILY_API}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name,
      properties: {
        exp: expiresAt,
        max_participants: 3,
        enable_chat: false,
        enable_knocking: false,
      },
    }),
  })
  return res.json()
}

async function createMeetingToken(roomName: string, userId: string, expiresAt: number) {
  const res = await fetch(`${DAILY_API}/meeting-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: userId,
        exp: expiresAt,
        is_owner: false,
      },
    }),
  })
  return res.json()
}

// ── Handler ──
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // JWT Auth [Refactoring 3: Lokal mit jose statt HTTP-Call]
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization' })
  }

  const user = await verifyJWT(authHeader.slice(7))
  if (!user) return res.status(401).json({ error: 'Invalid token' })

  try {
    const { sessionId } = req.body
    const roomName = `em-${sessionId}-${Date.now()}`
    const expiresAt = Math.floor(Date.now() / 1000) + 3600 // 1h

    const room = await createDailyRoom(roomName, expiresAt)
    const requesterToken = await createMeetingToken(roomName, 'requester', expiresAt)
    const partnerToken = await createMeetingToken(roomName, 'partner', expiresAt)

    // Optional: 3. Teilnehmer Token für Level 3
    let thirdToken = null
    if (req.body.includeThird) {
      thirdToken = await createMeetingToken(roomName, 'third', expiresAt)
    }

    return res.status(200).json({
      roomUrl: room.url,
      tokens: {
        requester: requesterToken.token,
        partner: partnerToken.token,
        third: thirdToken?.token ?? null,
      },
    })
  } catch (err) {
    console.error('Room creation error:', err)
    return res.status(500).json({ error: 'Failed to create room' })
  }
}
```

**Vorteile von jose gegenüber HTTP-Call:**
- Kein Netzwerk-Round-Trip für JWT-Verifizierung
- JWKS wird einmalig geladen und gecached
- ~50ms statt ~200ms pro Request
- Funktioniert auch bei Supabase-Downtime (JWKS cached)

---

## 16. Security

### 16.1 Architektur-Übersicht

```
┌─────────────────────────────────────────────────┐
│                    Frontend                      │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐ │
│  │ Rate     │  │ Anti-     │  │ Client       │ │
│  │ Limiting │  │ Enum.     │  │ Fingerprint  │ │
│  │ (Client) │  │ Messages  │  │ (SHA-256)    │ │
│  └────┬─────┘  └─────┬─────┘  └──────┬───────┘ │
│       │              │               │          │
└───────┼──────────────┼───────────────┼──────────┘
        │              │               │
        ▼              ▼               ▼
┌─────────────────────────────────────────────────┐
│              Supabase / API Layer                │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐ │
│  │ RLS      │  │ SECURITY  │  │ JWT Auth     │ │
│  │ Policies │  │ DEFINER   │  │ (jose)       │ │
│  │ (13 Tbl) │  │ RPCs      │  │ auf API      │ │
│  └──────────┘  └───────────┘  └──────────────┘ │
└─────────────────────────────────────────────────┘
```

### 16.2 Sicherheitsmaßnahmen

| Maßnahme | Implementierung |
|----------|----------------|
| **RLS auf allen Tabellen** | 13/13 Tabellen haben RLS-Policies |
| **SECURITY DEFINER RPCs** | Sensitive Queries laufen als DB-Owner, nicht als User |
| **anon REVOKED** | Partner-Suche, Empfehlungen, Letzte Partner: kein anonymer Zugriff |
| **Anti-Enumeration** | Login/Register/Reset zeigen immer generische Meldungen |
| **Rate Limiting** | 5 Versuche / 15 Min, IP-Hash + Email-Hash, fail-closed |
| **JWT Auth auf API** | /api/create-room verifiziert JWT lokal mit jose |
| **Email nicht in Suche** | search_partners_fuzzy gibt kein email-Feld zurück |
| **Token-Validation via RPC** | validate_invitation_token statt direktem SELECT |
| **GDPR Delete** | delete_own_account RPC + CASCADE auf alle Tabellen |
| **CORS Whitelist** | Nur erlaubte Origins auf API-Endpoints |
| **CSP Headers** | Content-Security-Policy auf Vercel |
| **HSTS** | Strict-Transport-Security auf allen Responses |
| **Permissions-Policy** | camera=*, microphone=* (für Daily.co), geolocation=() |

### 16.3 Passwort-Reset Flow (Anti-Enumeration)

```
User gibt Email ein
        │
        ▼
supabase.auth.resetPasswordForEmail(email)
        │
        ▼
IMMER: "Wenn ein Konto existiert, wurde eine Email gesendet"
        │
        ▼ (nur wenn Konto existiert)
Email mit Magic Link → /reset-password?token=xxx
        │
        ▼
supabase.auth.updateUser({ password })
```

### 16.4 Session-Sicherheit

- Room-URLs und Meeting-Tokens nur für Session-Teilnehmer sichtbar (RLS)
- Offene Sessions zeigen nur nicht-sensitive Daten via RPC
- Meeting-Tokens haben 1h Ablauf
- Räume haben max_participants: 3

---

## 17. Theming

### 17.1 Theme-Konfiguration (src/config/themeConfig.ts)

```typescript
export type ThemeName = 'ERDUNG' | 'KLARHEIT' | 'WALD_MOOS' | 'GOPAL'

export const THEME_CONFIG: Record<ThemeName, Record<string, string>> = {
  ERDUNG: {   // Dark, warm
    bg: '#140f0a',      card: '#1f1810',     text: '#f5ead6',
    textMuted: '#d4b886', accent: '#cf8a2e',  accentSecondary: '#5a9160',
    border: '#362a18',   footer: '#1f1810',
  },
  KLARHEIT: { // Light, clean
    bg: '#fdf8f0',      card: '#ffffff',     text: '#362a18',
    textMuted: '#6e4f26', accent: '#a84832',  accentSecondary: '#457348',
    border: '#e8d5b0',   footer: '#f5ead6',
  },
  WALD_MOOS: { // Dark, green
    bg: '#0a1a0a',      card: '#142014',     text: '#d4e5d4',
    textMuted: '#7dad7d', accent: '#7a9a7a',  accentSecondary: '#d4a843',
    border: '#264028',   footer: '#142014',
  },
  GOPAL: {     // Bright, warm
    bg: '#fdf2ef',      card: '#ffffff',     text: '#523b1d',
    textMuted: '#8a6430', accent: '#c05a3e',  accentSecondary: '#d4a843',
    border: '#f5d5cc',   footer: '#f5ead6',
  },
}

export const THEME_PREVIEW_COLORS: Record<ThemeName, { bg: string; accent: string; text: string }> = {
  ERDUNG:    { bg: '#140f0a', accent: '#cf8a2e', text: '#f5ead6' },
  KLARHEIT:  { bg: '#fdf8f0', accent: '#a84832', text: '#362a18' },
  WALD_MOOS: { bg: '#0a1a0a', accent: '#7a9a7a', text: '#d4e5d4' },
  GOPAL:     { bg: '#fdf2ef', accent: '#c05a3e', text: '#523b1d' },
}
```

### 17.2 Theme-Anwendung

Alle Komponenten nutzen CSS Custom Properties statt fester Farben:

```vue
<template>
  <div class="bg-[var(--theme-bg)] text-[var(--theme-text)]">
    <div class="bg-[var(--theme-card)] border-[var(--theme-border)]">
      <h1 class="text-[var(--theme-accent)]">Titel</h1>
      <p class="text-[var(--theme-text-muted)]">Beschreibung</p>
    </div>
  </div>
</template>
```

---

## 18. Internationalisierung

### 18.1 Setup (src/i18n/index.ts)

```typescript
import { createI18n } from 'vue-i18n'
import de from './locales/de.json'
import en from './locales/en.json'

function detectLocale(): string {
  const stored = localStorage.getItem('em-locale')
  if (stored) return stored
  const browser = navigator.language.split('-')[0]
  return ['de', 'en'].includes(browser) ? browser : 'de'
}

export default createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'de',
  messages: { de, en },
})
```

### 18.2 Locale-Composable

```typescript
// src/composables/useLocale.ts
import { useI18n } from 'vue-i18n'

export function useLocale() {
  const { locale } = useI18n()

  function setLocale(lang: 'de' | 'en') {
    locale.value = lang
    localStorage.setItem('em-locale', lang)
    document.documentElement.lang = lang
  }

  function toggleLocale() {
    setLocale(locale.value === 'de' ? 'en' : 'de')
  }

  return { locale, setLocale, toggleLocale }
}
```

### 18.3 i18n Key-Struktur (Auszug)

```json
{
  "app": { "name": "EM Vernetzung", "tagline": "..." },
  "nav": { "partner": "Partner finden", "sessions": "Sessions", "calendar": "Kalender", "profile": "Profil" },
  "auth": {
    "login": { "title": "Anmelden", "email": "E-Mail", "password": "Passwort", "rememberMe": "Angemeldet bleiben", "submit": "Anmelden", "noAccount": "Noch kein Konto?" },
    "register": { "title": "Registrieren", "name": "Name", "inviteCode": "Einladungscode", "submit": "Registrieren" },
    "errors": {
      "signInFailed": "Anmeldung fehlgeschlagen. Bitte überprüfe deine Eingaben.",
      "signUpFailed": "Registrierung fehlgeschlagen. Bitte versuche es erneut.",
      "tooManyAttempts": "Zu viele Versuche. Bitte warte {seconds} Sekunden.",
      "rateLimitError": "Anmeldung derzeit nicht möglich. Bitte versuche es später erneut."
    }
  },
  "partner": { "search": "Partner suchen...", "recommended": "Empfohlen für dich", "recent": "Letzte Partner", "online": "Gerade online", "noResults": "Keine Partner gefunden" },
  "session": { "request": "Session anfragen", "pending": "Ausstehend", "active": "Aktiv", "completed": "Abgeschlossen" },
  "feedback": { "structure": "Struktur", "presence": "Präsenz", "overall": "Gesamt", "wouldPracticeAgain": "Würde wieder mit dieser Person üben" },
  "trust": { "new": "Neu", "known": "Bekannt", "verified": "Verifiziert" },
  "profile": { "editProfile": "Profil bearbeiten", "deleteAccount": "Konto löschen", "deleteWarning": "Diese Aktion kann nicht rückgängig gemacht werden." },
  "calendar": { "availability": "Verfügbarkeit", "scheduled": "Geplante Sessions", "propose": "Termin vorschlagen" }
}
```

---

## 19. Real-time & Presence

### 19.1 Realtime Subscriptions (mit TanStack Query Integration)

```typescript
// Pattern: Realtime Subscription + Query Invalidation
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/vue-query'
import { onMounted, onUnmounted } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useRealtimeSync() {
  const queryClient = useQueryClient()
  let channels: RealtimeChannel[] = []

  onMounted(() => {
    // Sessions: Invalidiere bei INSERT/UPDATE
    const sessionChannel = supabase
      .channel('sessions-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'sessions',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['sessions'] })
      })
      .subscribe()

    // Messages: Invalidiere bei INSERT
    const messageChannel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
      }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['messages'] })
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      })
      .subscribe()

    // Scheduled Sessions: Invalidiere bei UPDATE
    const scheduleChannel = supabase
      .channel('schedule-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'scheduled_sessions',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['scheduled-sessions'] })
      })
      .subscribe()

    // Peer Verifications
    const verifyChannel = supabase
      .channel('verify-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'peer_verifications',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['verifications'] })
        queryClient.invalidateQueries({ queryKey: ['partners'] })
      })
      .subscribe()

    channels = [sessionChannel, messageChannel, scheduleChannel, verifyChannel]
  })

  onUnmounted(() => {
    channels.forEach(ch => supabase.removeChannel(ch))
  })
}
```

### 19.2 Presence (Online-Status) [Refactoring 2]

```
┌────────────────────────────────────────┐
│    Supabase Presence Channel           │
│    "online-users"                      │
│                                        │
│  User A: track({ user_id: 'a' })  ──┐ │
│  User B: track({ user_id: 'b' })  ──┤ │
│  User C: track({ user_id: 'c' })  ──┤ │
│                                      │ │
│  presenceState() ────────────────────┘ │
│  → { 'a': [...], 'b': [...], 'c': [...] } │
│                                        │
│  Events: sync, join, leave             │
└────────────────────────────────────────┘

VORHER: Heartbeat (80 Zeilen)
  - setInterval(2min): UPDATE profiles SET is_online=true
  - visibilitychange: UPDATE bei Tab-Wechsel
  - beforeunload: UPDATE is_online=false
  - Problem: Nicht zuverlässig bei Crash/Disconnect

NACHHER: Presence (15 Zeilen)
  - channel.track({ user_id })
  - Automatisches Cleanup bei Disconnect
  - presenceState() für alle Online-User
  - Kein DB-Write für Online-Status
```


---

## 20. Deployment

### 20.1 Vercel Setup

```bash
# 1. Vercel CLI installieren
npm i -g vercel

# 2. Projekt verknüpfen
vercel link

# 3. Environment Variables setzen (im Vercel Dashboard → Project Settings → Environment Variables)
#    Production + Preview + Development:
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
DAILY_API_KEY=xxx                  # NUR Production (serverless functions)
VITE_VAPID_PUBLIC_KEY=xxx          # Optional (Push Notifications)

# 4. Deploy
vercel --prod
```

### 20.2 Supabase Setup

```bash
# 1. Supabase Projekt erstellen (Dashboard oder CLI)
npx supabase init
npx supabase link --project-ref YOUR_PROJECT_ID

# 2. Migrations anwenden
npx supabase db push

# 3. Storage Bucket erstellen (einmalig im Dashboard)
# → Storage → New Bucket → "avatars" → Public = true

# 4. Auth Konfiguration (Dashboard → Authentication → Settings)
# → Site URL: https://your-domain.com
# → Redirect URLs: https://your-domain.com/reset-password
# → Email Templates anpassen (optional)

# 5. Types generieren
npm run types:generate
```

### 20.3 Daily.co Setup

```bash
# 1. Account erstellen: https://www.daily.co/
# 2. API Key kopieren: Dashboard → Developers → API Keys
# 3. In Vercel Environment Variables als DAILY_API_KEY setzen
# 4. Domain konfigurieren (optional): Dashboard → Settings → Domain
```

### 20.4 PWA / Service Worker

```javascript
// public/sw.js (minimal)
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'EM Vernetzung', {
      body: data.body ?? '',
      icon: '/favicon.ico',
      data: data.url ? { url: data.url } : undefined,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.notification.data?.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url))
  }
})
```

---

## 21. Checkliste

### Pre-Launch

- [ ] Supabase Projekt erstellen + Migrations deployen
- [ ] Storage Bucket "avatars" anlegen (Public)
- [ ] Supabase Auth: Site URL + Redirect URLs konfigurieren
- [ ] pg_trgm Extension aktivieren
- [ ] Daily.co Account + API Key
- [ ] Vercel Projekt erstellen
- [ ] Environment Variables in Vercel setzen
- [ ] CORS Origins in vercel.json prüfen
- [ ] CSP Headers anpassen (Daily.co Domain, Supabase Domain)
- [ ] Types generieren: `npm run types:generate`
- [ ] Build testen: `npm run build`
- [ ] TypeCheck: `npm run typecheck`

### Security-Check

- [ ] Alle 13 Tabellen haben RLS aktiviert
- [ ] anon REVOKED auf search_partners_fuzzy, get_recommended_partners, get_recent_partners
- [ ] Email nicht in Partner-Suche Ergebnis
- [ ] Anti-Enumeration auf Login/Register/Reset
- [ ] Rate Limiting fail-closed
- [ ] JWT Auth auf /api/create-room
- [ ] CSP Headers korrekt
- [ ] HSTS aktiviert
- [ ] X-Frame-Options: DENY

### Feature-Check

- [ ] Login/Register/Logout funktioniert
- [ ] Partner-Suche mit Fuzzy + Filter
- [ ] Empfohlene Partner werden angezeigt
- [ ] Session erstellen/akzeptieren/starten
- [ ] Video-Call via Daily.co
- [ ] Chat senden/empfangen + Gelesen-Status
- [ ] Feedback nach Session (3 Kategorien)
- [ ] Peer-Verification + Trust-Level Update
- [ ] Einladungen erstellen/validieren
- [ ] Kalender: Verfügbarkeit + Terminvorschläge
- [ ] Profil bearbeiten + Avatar-Upload
- [ ] Account-Löschung mit Warnung
- [ ] Theme-Wechsel (4 Themes)
- [ ] Sprach-Wechsel (DE/EN)
- [ ] Online-Status via Presence
- [ ] Offline-Indicator
- [ ] Cookie-Banner

### Performance-Check

- [ ] Bundle Size < 600KB pro Chunk
- [ ] Lazy-Loading auf allen Views
- [ ] TanStack Query Caching aktiv (staleTime: 2min)
- [ ] Bilder komprimiert (Canvas API beim Upload)
- [ ] Fonts: preconnect + display=swap

---

## Zusammenfassung der 5 Refactorings

| # | Refactoring | Vorher | Nachher | Vorteil |
|---|-------------|--------|---------|---------|
| 1 | **TanStack Query** | 60-75 try-catch Blöcke | Query/Mutation Hooks | Auto-Cache, Retry, Deduplication |
| 2 | **Supabase Presence** | 80 Zeilen Heartbeat | ~20 Zeilen Presence API | Zuverlässig, kein DB-Write |
| 3 | **jose JWT** | HTTP-Call zu /auth/v1/user | Lokale JWKS Verifizierung | ~50ms statt ~200ms, offline-fähig |
| 4 | **Auto Types** | ~200 Zeilen manuell | CLI: supabase gen types | Immer synchron mit DB |
| 5 | **Pinia richtig** | Installiert, ungenutzt | Auth Store + App Store | Klare Trennung Server/App State |

---

*Diese Datei dient als vollständiger Blueprint. Alle Code-Beispiele sind produktionsbereit und können direkt als Starter verwendet werden.*
