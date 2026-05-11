import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import DyadInstructions from './components/DyadInstructions';
import SessionInviteBanner from './components/SessionInviteBanner';
import AppNavigation from './components/AppNavigation';
import AuthView from './components/auth/AuthView';
import ErrorBoundary from './components/ErrorBoundary';
import CategoryPicker from './components/CategoryPicker';
import { fetchDyadPrompt } from './services/geminiService';
import { getRandomQuestion } from './data/dyadQuestions';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SessionProvider } from './contexts/SessionContext';
import { Wind, Users, BookOpen, Sparkles, ChevronRight, Loader2 } from 'lucide-react';

// Lazy-loaded Route-Komponenten
const PartnerConnect = React.lazy(() => import('./components/PartnerConnect'));
const ActiveSession = React.lazy(() => import('./components/ActiveSession'));
const UserProfile = React.lazy(() => import('./components/UserProfile'));
const Calendar = React.lazy(() => import('./components/Calendar'));
const PracticeGroups = React.lazy(() => import('./components/PracticeGroups'));
const PartnerFinder = React.lazy(() => import('./components/PartnerFinder'));
const ResetPassword = React.lazy(() => import('./components/auth/ResetPassword'));

// Suspense-Fallback
const RouteFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-8 h-8 text-[var(--c-text-muted)] animate-spin" />
  </div>
);

// Home View Component
const HomeView: React.FC = () => {
  const navigate = useNavigate();
  const [dailyPrompt, setDailyPrompt] = useState<{question: string, context?: string, category?: string} | null>(null);
  const [isPromptLoading, setIsPromptLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [useAi, setUseAi] = useState(true);
  const { t } = useSettings();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsPromptLoading(true);
      try {
        if (useAi) {
          const data = await fetchDyadPrompt(selectedCategory || undefined);
          if (!cancelled) setDailyPrompt(data);
        } else {
          const q = getRandomQuestion(selectedCategory || undefined);
          if (!cancelled) setDailyPrompt({ question: q.text, category: q.category });
        }
      } catch (err) {
        if (!cancelled) console.error('[HomeView] Prompt load error:', err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setIsPromptLoading(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [user, selectedCategory, useAi]);

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 pb-24 text-center fade-in">
      <header className="mb-10 space-y-2 pt-8">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-[var(--c-bg-card)] rounded-2xl shadow-sm shadow-black/5">
            <Wind className="w-8 h-8 text-[var(--c-text-muted)]" />
          </div>
        </div>
        <h1 className="text-4xl md:text-6xl font-serif text-[var(--c-text-main)] tracking-tight">Dyadenpraxis</h1>
        <p className="text-[var(--c-text-muted)] font-light tracking-wide uppercase text-sm">{t.home.subtitle}</p>
      </header>

      <main className="max-w-lg w-full space-y-6">
        {/* Daily Card */}
        <div className="bg-[var(--c-bg-card)]/70 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-[var(--c-border)] space-y-4 text-left relative overflow-hidden group">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[var(--c-text-muted)] mb-2">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span>{t.home.dailyImpulse}</span>
            {dailyPrompt?.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--c-accent)]/10 text-[var(--c-accent)] normal-case tracking-normal">
                {dailyPrompt.category}
              </span>
            )}
          </div>

          {isPromptLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-[var(--c-border)] rounded w-3/4"></div>
              <div className="h-4 bg-[var(--c-border)] rounded w-1/2"></div>
            </div>
          ) : dailyPrompt ? (
            <>
              <h3 className="text-2xl font-serif text-[var(--c-text-main)] leading-tight">&ldquo;{dailyPrompt.question}&rdquo;</h3>
              {dailyPrompt.context && <p className="text-[var(--c-text-muted)] text-sm font-light leading-relaxed">{dailyPrompt.context}</p>}
            </>
          ) : null}
        </div>

        {/* Category Picker */}
        <CategoryPicker
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
          showAiToggle={true}
          useAi={useAi}
          onToggleAi={setUseAi}
        />

        {/* Main Call to Action */}
        <button
          onClick={() => navigate('/connect')}
          className="w-full py-5 px-6 bg-[var(--c-accent)] text-[var(--c-accent-fg)] rounded-2xl font-medium hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-[var(--c-bg-app)]/20 rounded-full">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-light opacity-80">{t.home.start}</div>
              <div className="text-lg font-serif">{t.home.quickMatch}</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>

        <button
          onClick={() => navigate('/instructions')}
          className="w-full py-4 px-6 bg-[var(--c-bg-card)]/50 text-[var(--c-text-muted)] border border-[var(--c-border)] rounded-2xl font-medium hover:bg-[var(--c-bg-card)] hover:text-[var(--c-text-main)] transition-colors flex items-center justify-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          <span>{t.home.howItWorks}</span>
        </button>
      </main>
    </div>
  );
};

// App Content with Router
const AppContent: React.FC = () => {
  const { user, initialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Loading-Screen waehrend Auth initialisiert
  if (!initialized) {
    return (
      <div className="min-h-screen bg-[var(--c-bg-app)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--c-text-muted)] animate-spin" />
      </div>
    );
  }

  // Oeffentliche Routen die ohne Auth erreichbar sind
  const PUBLIC_PATHS = ['/reset-password'];

  // Auth-Guard: Nicht eingeloggt -> Login-Screen (ausser PUBLIC_PATHS)
  if (!user && !PUBLIC_PATHS.includes(location.pathname)) {
    return <AuthView />;
  }

  const handleConnected = () => {
    navigate('/session');
  };

  // Determine if nav should be hidden
  const hideNav = ['/session', '/connect', '/instructions', '/reset-password'].some(p => location.pathname.startsWith(p));

  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--c-bg-app)] text-[var(--c-text-main)] font-sans transition-colors duration-500">
      
      {/* Incoming Session Invitations */}
      <SessionInviteBanner onAccepted={handleConnected} />
      
      {/* Background Ambience */}
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-100/20 dark:bg-blue-900/20 blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-orange-50/40 dark:bg-orange-900/20 blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
      <div className="fixed top-[40%] left-[50%] -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-slate-100/30 dark:bg-slate-800/20 blur-[80px] pointer-events-none" />

      {/* Routes */}
      <div className="relative z-10">
        <ErrorBoundary
          fallbackTitle="Verbindungsfehler"
          fallbackMessage="Bei der Verbindung ist ein Fehler aufgetreten. Bitte versuche es erneut."
          onReset={() => navigate('/')}
        >
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/instructions" element={<DyadInstructions onBack={() => navigate('/')} />} />
            <Route path="/connect" element={
              <ErrorBoundary
                fallbackTitle="Verbindungsfehler"
                fallbackMessage="Das Matching konnte nicht gestartet werden."
                onReset={() => navigate('/')}
              >
                <Suspense fallback={<RouteFallback />}>
                  <PartnerConnect onConnected={handleConnected} onCancel={() => navigate('/')} />
                </Suspense>
              </ErrorBoundary>
            } />
            <Route path="/session" element={
              <ErrorBoundary
                fallbackTitle="Session-Fehler"
                fallbackMessage="Die Session wurde unterbrochen. Bitte starte eine neue Session."
                onReset={() => navigate('/')}
              >
                <Suspense fallback={<RouteFallback />}>
                  <ActiveSession onClose={() => navigate('/')} />
                </Suspense>
              </ErrorBoundary>
            } />
            <Route path="/session/:sessionId" element={
              <ErrorBoundary
                fallbackTitle="Session-Fehler"
                fallbackMessage="Die Session wurde unterbrochen. Bitte starte eine neue Session."
                onReset={() => navigate('/')}
              >
                <Suspense fallback={<RouteFallback />}>
                  <ActiveSession onClose={() => navigate('/')} />
                </Suspense>
              </ErrorBoundary>
            } />
            <Route path="/profile" element={<Suspense fallback={<RouteFallback />}><UserProfile /></Suspense>} />
            <Route path="/calendar" element={<Suspense fallback={<RouteFallback />}><Calendar /></Suspense>} />
            <Route path="/groups" element={<Suspense fallback={<RouteFallback />}><PracticeGroups /></Suspense>} />
            <Route path="/partner-finder" element={<Suspense fallback={<RouteFallback />}><PartnerFinder onQuickMatch={() => navigate('/connect')} onSelectPartner={(partner) => navigate('/connect', { state: { selectedPartner: partner } })} /></Suspense>} />
            <Route path="/reset-password" element={
              <ErrorBoundary
                fallbackTitle="Fehler"
                fallbackMessage="Passwort-Zurücksetzung fehlgeschlagen. Bitte versuche es erneut."
                onReset={() => navigate('/')}
              >
                <Suspense fallback={<RouteFallback />}>
                  <ResetPassword />
                </Suspense>
              </ErrorBoundary>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </div>

      {/* Navigation */}
      {user && !hideNav && <AppNavigation />}
    </div>
  );
};

// Root App Component with BrowserRouter
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <SessionProvider>
            <AppContent />
          </SessionProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
