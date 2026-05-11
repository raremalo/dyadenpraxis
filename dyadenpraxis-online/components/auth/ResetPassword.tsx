import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Wind, Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const { updatePassword, signOut, isPasswordRecovery } = useAuth();
  const { t } = useSettings();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (newPassword.length < 6) {
      setError(t.auth.passwordMinLength);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.auth.resetErrorMismatch);
      return;
    }

    setLoading(true);
    try {
      const result = await updatePassword(newPassword);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      await signOut();
    } catch {
      setError(t.auth.resetErrorGeneral);
    } finally {
      setLoading(false);
    }
  };

  // No valid recovery session — show expired message
  if (!isPasswordRecovery && !success) {
    return (
      <div className="min-h-screen bg-[var(--c-bg-app)] flex flex-col items-center justify-center px-6">
        <div className="text-center mb-10 fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--c-accent)]/10 mb-4">
            <Wind className="w-8 h-8 text-[var(--c-accent)]" />
          </div>
          <h1 className="text-3xl font-serif text-[var(--c-text-main)] mt-1">
            {t.auth.welcomeSubtitle}
          </h1>
        </div>

        <div className="w-full max-w-sm bg-[var(--c-bg-card)] border border-[var(--c-border)] rounded-2xl p-6 shadow-sm fade-in">
          <div className="flex flex-col items-center text-center py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/20 mb-4">
              <AlertCircle className="w-6 h-6 text-rose-500" />
            </div>
            <p className="text-[var(--c-text-main)] text-sm mb-4">
              {t.auth.resetErrorExpired}
            </p>
            <button
              onClick={() => navigate('/')}
              className="text-[var(--c-accent)] font-medium text-sm hover:underline"
            >
              {t.auth.backToLogin}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-[var(--c-bg-app)] flex flex-col items-center justify-center px-6">
        <div className="text-center mb-10 fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--c-accent)]/10 mb-4">
            <Wind className="w-8 h-8 text-[var(--c-accent)]" />
          </div>
          <h1 className="text-3xl font-serif text-[var(--c-text-main)] mt-1">
            {t.auth.welcomeSubtitle}
          </h1>
        </div>

        <div className="w-full max-w-sm bg-[var(--c-bg-card)] border border-[var(--c-border)] rounded-2xl p-6 shadow-sm fade-in">
          <div className="flex flex-col items-center text-center py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 mb-4">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-green-600 dark:text-green-400 text-sm font-medium mb-4">
              {t.auth.resetSuccess}
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-[var(--c-accent)] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-all"
            >
              {t.auth.loginSubmit}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="min-h-screen bg-[var(--c-bg-app)] flex flex-col items-center justify-center px-6">
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
          {t.auth.newPassword}
        </p>
      </div>

      <div className="w-full max-w-sm bg-[var(--c-bg-card)] border border-[var(--c-border)] rounded-2xl p-6 shadow-sm fade-in">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-text-muted)]" />
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder={t.auth.newPassword}
              required
              minLength={6}
              className="w-full pl-10 pr-4 py-3 bg-[var(--c-bg-app)] border border-[var(--c-border)] rounded-lg text-[var(--c-text-main)] placeholder:text-[var(--c-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30 transition-all text-sm"
            />
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-text-muted)]" />
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder={t.auth.confirmPassword}
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
            {loading ? t.auth.resetting : t.auth.resetSubmit}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
