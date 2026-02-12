import React, { useRef, useState } from 'react';
import { Clock, CheckCircle, LogOut, Globe, Palette, Moon, Sun, Coffee, Leaf, Camera, Loader2, Trash2, AlertTriangle, Bell } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useAvatarUpload } from '../hooks/useAvatarUpload';
import { useAccountDeletion } from '../hooks/useAccountDeletion';
import { NotificationPermission } from './NotificationPermission';

const Profile: React.FC = () => {
  const { t, theme, setTheme, language, setLanguage } = useSettings();
  const { profile, signOut, refreshProfile, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploading, uploadAvatar } = useAvatarUpload({
    userId: user?.id ?? '',
    onSuccess: () => refreshProfile(),
  });

  const { isDeleting, error: deleteError, deleteAccount } = useAccountDeletion();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAvatar(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const displayName = profile?.name || '?';
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const estimatedMinutes = (profile?.sessions_completed ?? 0) * (profile?.preferred_duration ?? 20);

  const handleDeleteAccount = async () => {
    if (confirmText !== 'LOESCHEN') return;
    const success = await deleteAccount();
    if (success) {
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-32 px-6 max-w-lg mx-auto fade-in text-[var(--c-text-main)]">
      
      {/* Header Profile */}
      <div className="flex flex-col items-center text-center mb-12">
        <div className="relative mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleAvatarClick}
            disabled={uploading}
            className="relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)] focus:ring-offset-2 rounded-full"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="w-24 h-24 rounded-full object-cover shadow-inner" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[var(--c-border)] flex items-center justify-center text-3xl font-serif text-[var(--c-text-muted)] overflow-hidden shadow-inner">
                {initials}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploading ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
          </button>
          <div className={`absolute bottom-1 right-1 w-4 h-4 border-2 border-[var(--c-bg-app)] rounded-full ${profile?.is_online ? 'bg-emerald-400' : 'bg-gray-400'}`}></div>
        </div>
        <h2 className="text-3xl font-serif mb-2">{displayName}</h2>
        {profile?.bio && <p className="text-[var(--c-text-muted)] font-light text-sm max-w-xs">{profile.bio}</p>}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[var(--c-bg-card)] p-5 rounded-2xl border border-[var(--c-border)] shadow-sm flex flex-col items-center gap-2">
          <Clock className="w-5 h-5 text-orange-400" />
          <span className="text-2xl font-serif">{estimatedMinutes}</span>
          <span className="text-xs text-[var(--c-text-muted)] uppercase tracking-widest">{t.profile.minutes}</span>
        </div>
        <div className="bg-[var(--c-bg-card)] p-5 rounded-2xl border border-[var(--c-border)] shadow-sm flex flex-col items-center gap-2">
          <CheckCircle className="w-5 h-5 text-blue-400" />
          <span className="text-2xl font-serif">{profile?.sessions_completed ?? 0}</span>
          <span className="text-xs text-[var(--c-text-muted)] uppercase tracking-widest">{t.profile.sessions}</span>
        </div>
      </div>

      {/* Settings Section */}
      <div className="space-y-6">
        
        {/* Language Switcher */}
        <div className="bg-[var(--c-bg-card)] rounded-3xl border border-[var(--c-border)] shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4 text-[var(--c-text-muted)] text-sm uppercase tracking-widest">
                <Globe className="w-4 h-4" />
                <span>{t.profile.language}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={() => setLanguage('de')}
                    className={`py-2 px-4 rounded-xl text-sm font-medium transition-all ${language === 'de' ? 'bg-[var(--c-accent)] text-[var(--c-accent-fg)]' : 'bg-[var(--c-bg-app)] hover:bg-[var(--c-bg-card-hover)]'}`}
                >
                    Deutsch
                </button>
                <button 
                    onClick={() => setLanguage('en')}
                    className={`py-2 px-4 rounded-xl text-sm font-medium transition-all ${language === 'en' ? 'bg-[var(--c-accent)] text-[var(--c-accent-fg)]' : 'bg-[var(--c-bg-app)] hover:bg-[var(--c-bg-card-hover)]'}`}
                >
                    English
                </button>
            </div>
        </div>

        {/* Theme Switcher */}
        <div className="bg-[var(--c-bg-card)] rounded-3xl border border-[var(--c-border)] shadow-sm p-5">
             <div className="flex items-center gap-3 mb-4 text-[var(--c-text-muted)] text-sm uppercase tracking-widest">
                <Palette className="w-4 h-4" />
                <span>{t.profile.theme}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
                <button 
                    onClick={() => setTheme('light')}
                    className={`py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${theme === 'light' ? 'bg-[var(--c-accent)] text-[var(--c-accent-fg)]' : 'bg-[var(--c-bg-app)] hover:bg-[var(--c-bg-card-hover)]'}`}
                >
                    <Sun className="w-4 h-4" />
                    <span className="text-xs">{t.profile.themeLight}</span>
                </button>
                <button 
                    onClick={() => setTheme('dark')}
                    className={`py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${theme === 'dark' ? 'bg-[var(--c-accent)] text-[var(--c-accent-fg)]' : 'bg-[var(--c-bg-app)] hover:bg-[var(--c-bg-card-hover)]'}`}
                >
                    <Moon className="w-4 h-4" />
                    <span className="text-xs">{t.profile.themeDark}</span>
                </button>
                <button 
                    onClick={() => setTheme('warm')}
                    className={`py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${theme === 'warm' ? 'bg-[var(--c-accent)] text-[var(--c-accent-fg)]' : 'bg-[var(--c-bg-app)] hover:bg-[var(--c-bg-card-hover)]'}`}
                >
                    <Coffee className="w-4 h-4" />
                    <span className="text-xs">{t.profile.themeWarm}</span>
                </button>
                <button 
                    onClick={() => setTheme('nature')}
                    className={`py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${theme === 'nature' ? 'bg-[var(--c-accent)] text-[var(--c-accent-fg)]' : 'bg-[var(--c-bg-app)] hover:bg-[var(--c-bg-card-hover)]'}`}
                >
                    <Leaf className="w-4 h-4" />
                    <span className="text-xs">{t.profile.themeNature}</span>
                </button>
            </div>
        </div>

        {/* Notifications */}
        <div className="bg-[var(--c-bg-card)] rounded-3xl border border-[var(--c-border)] shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4 text-[var(--c-text-muted)] text-sm uppercase tracking-widest">
            <Bell className="w-4 h-4" />
            <span>{t.notifications.title}</span>
          </div>
          <NotificationPermission />
        </div>

        {/* General Actions */}
        <div className="bg-[var(--c-bg-card)] rounded-3xl border border-[var(--c-border)] shadow-sm overflow-hidden">
           <button onClick={signOut} className="w-full flex items-center justify-between p-5 hover:bg-[var(--c-bg-card-hover)] transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-rose-50/50 rounded-full text-rose-500"><LogOut className="w-4 h-4" /></div>
              <span className="text-rose-500 font-medium">{t.profile.logout}</span>
            </div>
          </button>
        </div>

        {/* Account Loeschung (GDPR) */}
        <div className="bg-[var(--c-bg-card)] rounded-3xl border border-rose-200 dark:border-rose-800/50 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3 text-rose-500 text-sm uppercase tracking-widest">
            <Trash2 className="w-4 h-4" />
            <span>{t.deleteAccount?.title || 'Account loeschen'}</span>
          </div>
          <p className="text-[var(--c-text-muted)] text-sm mb-4">
            {t.deleteAccount?.description || 'Dein Account und alle zugehoerigen Daten werden unwiderruflich geloescht (DSGVO Art. 17).'}
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-medium hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors border border-rose-200 dark:border-rose-800/50"
            >
              {t.deleteAccount?.button || 'Account endgueltig loeschen'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800/50">
                <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-rose-700 dark:text-rose-300">
                  <p className="font-medium mb-1">{t.deleteAccount?.warningTitle || 'Achtung: Nicht rueckgaengig zu machen!'}</p>
                  <p>{t.deleteAccount?.warningText || 'Alle Sessions, Nachrichten, Bewertungen und Verifizierungen werden permanent geloescht.'}</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--c-text-muted)] mb-1 block">
                  {t.deleteAccount?.confirmLabel || 'Tippe LOESCHEN zur Bestaetigung:'}
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="LOESCHEN"
                  className="w-full px-4 py-2 rounded-xl bg-[var(--c-bg-app)] border border-[var(--c-border)] text-[var(--c-text-main)] text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {deleteError && (
                <p className="text-rose-500 text-sm">{deleteError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setConfirmText(''); }}
                  className="flex-1 py-2.5 bg-[var(--c-bg-app)] text-[var(--c-text-main)] rounded-xl text-sm font-medium border border-[var(--c-border)] hover:bg-[var(--c-bg-card-hover)] transition-colors"
                >
                  {t.deleteAccount?.cancel || 'Abbrechen'}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={confirmText !== 'LOESCHEN' || isDeleting}
                  className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t.deleteAccount?.confirm || 'Endgueltig loeschen'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
