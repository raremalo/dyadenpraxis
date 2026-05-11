import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Wind, Mail, Lock, User, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

const AuthView: React.FC = () => {
  const { signIn, signUp, resetPassword, loading } = useAuth();
  const { t } = useSettings();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'forgot') {
      await resetPassword(email);
      // Anti-enumeration: always show success
      setResetSent(true);
      return;
    }

    let result;
    if (mode === 'login') {
      result = await signIn(email, password);
    } else {
      if (!name.trim()) {
        setError('Bitte gib deinen Namen ein');
        return;
      }
      result = await signUp(email, password, name.trim());
    }

    if (result.error) {
      setError(result.error);
    }
  };

  const switchMode = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode);
    setError(null);
    setResetSent(false);
  };

  return (
    <div className="min-h-screen bg-[var(--c-bg-app)] flex flex-col items-center justify-center px-6">
      {/* Logo & Welcome */}
      <div className="text-center mb-10 fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--c-accent)]/10 mb-4">
          <Wind className="w-8 h-8 text-[var(--c-accent)]" />
        </div>
        <p className="text-sm text-[var(--c-text-muted)] tracking-widest uppercase">
          {t.auth.welcomeTitle}
        </p>
        <h1 className="text-3xl font-serif text-[var(--c-text-main)] mt-1">
          {t.auth.welcomeSubtitle}
        </h1>
        <p className="text-[var(--c-text-muted)] mt-2 text-sm max-w-xs mx-auto">
          {mode === 'forgot'
            ? t.auth.forgotPassword
            : t.auth.welcomeText
          }
        </p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-sm bg-[var(--c-bg-card)] border border-[var(--c-border)] rounded-2xl p-6 shadow-sm fade-in">
        {/* Forgot Success Panel */}
        {mode === 'forgot' && resetSent ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 mb-4">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-[var(--c-text-main)] mb-2">
              {t.auth.forgotSuccessTitle}
            </h3>
            <p className="text-sm text-[var(--c-text-muted)] mb-6">
              {t.auth.forgotSuccessText}
            </p>
            <button
              onClick={() => switchMode('login')}
              className="text-[var(--c-accent)] font-medium text-sm hover:underline flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.auth.backToLogin}
            </button>
          </div>
        ) : (
          <>
            {/* Tab Toggle — hidden in forgot mode */}
            {mode !== 'forgot' && (
              <div className="flex mb-6 bg-[var(--c-bg-app)] rounded-lg p-1">
                <button
                  onClick={() => switchMode('login')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    mode === 'login'
                      ? 'bg-[var(--c-bg-card)] text-[var(--c-text-main)] shadow-sm'
                      : 'text-[var(--c-text-muted)]'
                  }`}
                >
                  {t.auth.login}
                </button>
                <button
                  onClick={() => switchMode('register')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    mode === 'register'
                      ? 'bg-[var(--c-bg-card)] text-[var(--c-text-main)] shadow-sm'
                      : 'text-[var(--c-text-muted)]'
                  }`}
                >
                  {t.auth.register}
                </button>
              </div>
            )}

            {/* Back to Login link — only in forgot mode */}
            {mode === 'forgot' && (
              <button
                onClick={() => switchMode('login')}
                className="flex items-center gap-1 text-[var(--c-text-muted)] text-sm mb-4 hover:text-[var(--c-text-main)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t.auth.backToLogin}
              </button>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name (nur bei Registrierung) */}
              {mode === 'register' && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-text-muted)]" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t.auth.name}
                    className="w-full pl-10 pr-4 py-3 bg-[var(--c-bg-app)] border border-[var(--c-border)] rounded-lg text-[var(--c-text-main)] placeholder:text-[var(--c-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30 transition-all text-sm"
                  />
                </div>
              )}

              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-text-muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t.auth.email}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[var(--c-bg-app)] border border-[var(--c-border)] rounded-lg text-[var(--c-text-main)] placeholder:text-[var(--c-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30 transition-all text-sm"
                />
              </div>

              {/* Password — hidden in forgot mode */}
              {mode !== 'forgot' && (
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-text-muted)]" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t.auth.password}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-3 bg-[var(--c-bg-app)] border border-[var(--c-border)] rounded-lg text-[var(--c-text-main)] placeholder:text-[var(--c-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30 transition-all text-sm"
                  />
                </div>
              )}

              {/* Forgot Password link — only in login mode */}
              {mode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-[var(--c-text-muted)] text-xs hover:text-[var(--c-accent)] transition-colors"
                  >
                    {t.auth.forgotPassword}
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="text-red-500 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[var(--c-accent)] text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading
                  ? (mode === 'login' ? t.auth.loggingIn : mode === 'register' ? t.auth.registering : t.auth.forgotSubmitting)
                  : (mode === 'login' ? t.auth.loginSubmit : mode === 'register' ? t.auth.registerSubmit : t.auth.forgotSubmit)
                }
              </button>
            </form>

            {/* Toggle Link — hidden in forgot mode */}
            {mode !== 'forgot' && (
              <p className="text-center text-xs text-[var(--c-text-muted)] mt-4">
                {mode === 'login' ? t.auth.noAccount : t.auth.hasAccount}{' '}
                <button
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                  className="text-[var(--c-accent)] font-medium hover:underline"
                >
                  {mode === 'login' ? t.auth.register : t.auth.login}
                </button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuthView;
