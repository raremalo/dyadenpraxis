import React, { useState } from 'react';
import { Calendar, Clock, Check, X, Loader2, ChevronDown, ChevronUp, Bell } from 'lucide-react';
import { useScheduledSessions, type ScheduledSession } from '../hooks/useScheduledSessions';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { translations } from '../translations';
import AvailabilitySlotEditor from './AvailabilitySlotEditor';

export default function CalendarView() {
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

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(language === 'de' ? 'de-DE' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle accept
  const handleAccept = async (sessionId: string) => {
    setProcessingId(sessionId);
    await acceptProposal(sessionId);
    setProcessingId(null);
  };

  // Handle reject
  const handleReject = async (sessionId: string) => {
    setProcessingId(sessionId);
    await rejectProposal(sessionId);
    setProcessingId(null);
  };

  // Handle cancel
  const handleCancel = async (sessionId: string) => {
    setProcessingId(sessionId);
    await cancelScheduledSession(sessionId);
    setProcessingId(null);
  };

  // Get partner from session
  const getPartner = (session: ScheduledSession) => {
    if (session.requester_id === user?.id) {
      return session.partner;
    }
    return session.requester;
  };

  // Check if user is requester
  const isRequester = (session: ScheduledSession) => {
    return session.requester_id === user?.id;
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'proposed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'scheduled': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'rejected': return 'bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-300';
      case 'completed': return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
      default: return 'bg-stone-100 text-stone-700';
    }
  };

  // Get status label
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

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
          {t.calendar?.title || 'Kalender'}
        </h1>
        <div className="flex items-center gap-2">
          {pendingRequests.length > 0 && (
            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
              {pendingRequests.length} {t.calendar?.pending || 'ausstehend'}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-600" />
            {t.calendar?.pendingRequests || 'Ausstehende Anfragen'}
          </h2>
          
          {pendingRequests.map(session => {
            const partner = getPartner(session);
            return (
              <div
                key={session.id}
                className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {partner?.avatar_url ? (
                      <img
                        src={partner.avatar_url}
                        alt={partner.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
                        <span className="text-amber-700 dark:text-amber-300 font-medium text-lg">
                          {partner?.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-stone-900 dark:text-stone-100">
                        {partner?.name || 'Unbekannt'}
                      </p>
                      <p className="text-sm text-stone-600 dark:text-stone-400">
                        {formatDate(session.scheduled_for)} • {formatTime(session.scheduled_for)}
                      </p>
                      <p className="text-sm text-stone-500">
                        {session.duration} min • Level {session.level}
                      </p>
                    </div>
                  </div>
                </div>
                
                {session.message && (
                  <p className="mt-3 text-sm text-stone-600 dark:text-stone-400 italic">
                    "{session.message}"
                  </p>
                )}
                
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleAccept(session.id)}
                    disabled={processingId === session.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
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
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-lg hover:bg-stone-300 dark:hover:bg-stone-600 disabled:opacity-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    {t.calendar?.reject || 'Ablehnen'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming Sessions */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-600" />
          {t.calendar?.upcoming || 'Kommende Termine'}
        </h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : upcomingSessions.length === 0 ? (
          <div className="text-center py-8 text-stone-500 dark:text-stone-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t.calendar?.noUpcoming || 'Keine geplanten Termine'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map(session => {
              const partner = getPartner(session);
              return (
                <div
                  key={session.id}
                  className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {partner?.avatar_url ? (
                        <img
                          src={partner.avatar_url}
                          alt={partner.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                          <span className="text-amber-700 dark:text-amber-300 font-medium">
                            {partner?.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-stone-900 dark:text-stone-100">
                          {partner?.name || 'Unbekannt'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(session.scheduled_for)}
                          <Clock className="w-3.5 h-3.5 ml-1" />
                          {formatTime(session.scheduled_for)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {getStatusLabel(session.status)}
                      </span>
                      <button
                        onClick={() => handleCancel(session.id)}
                        disabled={processingId === session.id}
                        className="p-1.5 text-stone-400 hover:text-red-500 transition-colors"
                        title={t.calendar?.cancel || 'Absagen'}
                      >
                        {processingId === session.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center gap-4 text-sm text-stone-500">
                    <span>{session.duration} min</span>
                    <span>Level {session.level}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Availability Section */}
      <div className="border-t border-stone-200 dark:border-stone-700 pt-6">
        <button
          onClick={() => setShowAvailability(!showAvailability)}
          className="w-full flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-800 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <span className="font-medium text-stone-900 dark:text-stone-100">
              {t.calendar?.myAvailability || 'Meine Verfuegbarkeit'}
            </span>
          </div>
          {showAvailability ? (
            <ChevronUp className="w-5 h-5 text-stone-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-stone-400" />
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
}
