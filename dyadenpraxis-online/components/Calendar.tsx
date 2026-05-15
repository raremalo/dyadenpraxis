import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Bell,
  Plus,
  User,
} from 'lucide-react';
import { useScheduledSessions, type ScheduledSession } from '../hooks/useScheduledSessions';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { translations } from '../translations';
import AvailabilitySlotEditor from './AvailabilitySlotEditor';

const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useSettings();
  const t = translations[language];

  const {
    scheduledSessions,
    pendingRequests,
    upcomingSessions,
    isLoading,
    error,
    acceptProposal,
    rejectProposal,
    cancelScheduledSession,
  } = useScheduledSessions();

  const [showAvailability, setShowAvailability] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Helpers
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return language === 'de' ? 'Heute' : 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return language === 'de' ? 'Morgen' : 'Tomorrow';

    return date.toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(language === 'de' ? 'de-DE' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPartner = (session: ScheduledSession) => {
    if (session.requester_id === user?.id) {
      return session.partner;
    }
    return session.requester;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      proposed: t.calendar?.statusProposed || 'Vorgeschlagen',
      scheduled: t.calendar?.statusScheduled || 'Geplant',
      cancelled: t.calendar?.statusCancelled || 'Abgesagt',
      rejected: t.calendar?.statusRejected || 'Abgelehnt',
      completed: t.calendar?.statusCompleted || 'Abgeschlossen',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'proposed': return 'bg-blue-100 text-blue-700';
      case 'scheduled': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'rejected': return 'bg-stone-100 text-stone-500';
      case 'completed': return 'bg-amber-100 text-amber-700';
      default: return 'bg-stone-100 text-stone-500';
    }
  };

  // Actions
  const handleAccept = async (sessionId: string) => {
    setProcessingId(sessionId);
    await acceptProposal(sessionId);
    setProcessingId(null);
  };

  const handleReject = async (sessionId: string) => {
    setProcessingId(sessionId);
    await rejectProposal(sessionId);
    setProcessingId(null);
  };

  const handleCancel = async (sessionId: string) => {
    setCancellingId(sessionId);
    await cancelScheduledSession(sessionId);
    setCancellingId(null);
  };

  const handleScheduleSession = () => {
    navigate('/partner-finder');
  };

  // Partner avatar helper
  const renderPartnerAvatar = (name?: string | null, avatarUrl?: string | null, size: 'sm' | 'md' = 'sm') => {
    const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
    if (avatarUrl) {
      return <img src={avatarUrl} alt={name || ''} className={`${sizeClass} rounded-full object-cover`} />;
    }
    return (
      <div className={`${sizeClass} rounded-full bg-slate-100 flex items-center justify-center`}>
        <span className="text-slate-500 font-medium">{name?.charAt(0).toUpperCase() || '?'}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen pt-24 pb-32 px-6 max-w-lg mx-auto fade-in">
      {/* Header */}
      <header className="mb-8">
        <h2 className="text-3xl font-serif text-slate-800 mb-2">
          {t.calendar?.title || 'Kalender'}
        </h2>
        <p className="text-slate-500 font-light">Plane deine achtsamen Begegnungen.</p>
      </header>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm">
          {error}
        </div>
      )}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-medium text-slate-800">
              {t.calendar?.pendingRequests || 'Ausstehende Anfragen'}
            </h3>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
              {pendingRequests.length}
            </span>
          </div>

          <div className="space-y-3">
            {pendingRequests.map(session => {
              const partner = getPartner(session);
              return (
                <div
                  key={session.id}
                  className="bg-amber-50 border border-amber-200 p-5 rounded-3xl"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {renderPartnerAvatar(partner?.name, partner?.avatar_url, 'md')}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">
                        {partner?.name || 'Unbekannt'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span>{formatDate(session.scheduled_for)}</span>
                        <Clock className="w-3.5 h-3.5 ml-1" />
                        <span>{formatTime(session.scheduled_for)}</span>
                      </div>
                    </div>
                  </div>

                  {session.message && (
                    <p className="mb-3 text-sm text-slate-500 italic">&ldquo;{session.message}&rdquo;</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(session.id)}
                      disabled={processingId === session.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors font-medium text-sm"
                    >
                      {processingId === session.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          {t.calendar?.accept || 'Annehmen'}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleReject(session.id)}
                      disabled={processingId === session.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors font-medium text-sm"
                    >
                      <X className="w-4 h-4" />
                      {t.calendar?.reject || 'Ablehnen'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Sessions */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-medium text-slate-800">
            {t.calendar?.upcoming || 'Kommende Termine'}
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
          </div>
        ) : upcomingSessions.length === 0 && pendingRequests.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p className="text-slate-400">{t.calendar?.noUpcoming || 'Keine geplanten Termine'}</p>
            <p className="text-slate-300 text-sm mt-1">Plane eine Session mit einem Partner.</p>
          </div>
        ) : upcomingSessions.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-slate-400 text-sm">{t.calendar?.noUpcoming || 'Keine geplanten Termine'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingSessions.map(session => {
              const partner = getPartner(session);
              return (
                <div
                  key={session.id}
                  className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {renderPartnerAvatar(partner?.name, partner?.avatar_url, 'md')}
                      <div className="min-w-0">
                        <span className="inline-block px-3 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium tracking-wide mb-1">
                          {formatDate(session.scheduled_for)}
                        </span>
                        <h3 className="text-lg font-serif text-slate-800 truncate">
                          {partner?.name || 'Unbekannt'}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {getStatusLabel(session.status)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-slate-500 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(session.scheduled_for)} · {session.duration} min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>zu zweit</span>
                    </div>
                  </div>

                  {/* Cancel button */}
                  <button
                    onClick={() => handleCancel(session.id)}
                    disabled={cancellingId === session.id}
                    className="w-full py-2 text-sm text-slate-400 hover:text-red-500 border border-transparent hover:border-red-100 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {cancellingId === session.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        Absagen
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Eigene Session planen Button */}
      <button
        onClick={handleScheduleSession}
        className="w-full py-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 font-medium hover:border-amber-300 hover:text-amber-600 transition-all flex items-center justify-center gap-2 group"
      >
        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
        Eigene Session planen
      </button>

      {/* Availability Section */}
      <div className="mt-8 border-t border-slate-100 pt-6">
        <button
          onClick={() => setShowAvailability(!showAvailability)}
          className="w-full flex items-center justify-between py-3 px-1 text-left hover:text-slate-600 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            <span className="font-medium text-slate-600">
              {t.calendar?.myAvailability || 'Meine Verfuegbarkeit'}
            </span>
          </div>
          {showAvailability ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {showAvailability && (
          <div className="mt-4">
            <AvailabilitySlotEditor />
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;
