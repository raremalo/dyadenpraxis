import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Wind, Mail, Lock, User, Loader2 } from 'lucide-react';

const AuthView: React.FC = () => {
  const { signIn, signUp, loading } = useAuth();
  const { t } = useSettings();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let result;
    if (isLogin) {
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
          {t.auth.welcomeText}
        </p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-sm bg-[var(--c-bg-card)] border border-[var(--c-border)] rounded-2xl p-6 shadow-sm fade-in">
        {/* Tab Toggle */}
        <div className="flex mb-6 bg-[var(--c-bg-app)] rounded-lg p-1">
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              isLogin
                ? 'bg-[var(--c-bg-card)] text-[var(--c-text-main)] shadow-sm'
                : 'text-[var(--c-text-muted)]'
            }`}
          >
            {t.auth.login}
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              !isLogin
                ? 'bg-[var(--c-bg-card)] text-[var(--c-text-main)] shadow-sm'
                : 'text-[var(--c-text-muted)]'
            }`}
          >
            {t.auth.register}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name (nur bei Registrierung) */}
          {!isLogin && (
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

          {/* Password */}
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
              ? (isLogin ? t.auth.loggingIn : t.auth.registering)
              : (isLogin ? t.auth.loginSubmit : t.auth.registerSubmit)
            }
          </button>
        </form>

        {/* Toggle Link */}
        <p className="text-center text-xs text-[var(--c-text-muted)] mt-4">
          {isLogin ? t.auth.noAccount : t.auth.hasAccount}{' '}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-[var(--c-accent)] font-medium hover:underline"
          >
            {isLogin ? t.auth.register : t.auth.login}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthView;
