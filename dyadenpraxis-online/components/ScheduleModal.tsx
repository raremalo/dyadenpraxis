import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MessageSquare, Loader2 } from 'lucide-react';
import { useScheduledSessions } from '../hooks/useScheduledSessions';
import { useAvailability, WEEKDAYS, type OverlappingSlot } from '../hooks/useAvailability';
import { useSettings } from '../contexts/SettingsContext';
import { translations } from '../translations';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string | null;
  onSuccess?: () => void;
}

export default function ScheduleModal({
  isOpen,
  onClose,
  partnerId,
  partnerName,
  partnerAvatar,
  onSuccess,
}: ScheduleModalProps) {
  const { language } = useSettings();
  const t = translations[language];
  const weekdays = WEEKDAYS[language];
  
  const { proposeSession, error: sessionError } = useScheduledSessions();
  const { findOverlappingSlots } = useAvailability();

  const [overlappingSlots, setOverlappingSlots] = useState<OverlappingSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(15);
  const [message, setMessage] = useState('');

  // Load overlapping availability slots
  useEffect(() => {
    if (isOpen && partnerId) {
      setIsLoadingSlots(true);
      findOverlappingSlots(partnerId)
        .then(setOverlappingSlots)
        .finally(() => setIsLoadingSlots(false));
    }
  }, [isOpen, partnerId, findOverlappingSlots]);

  // Set default date to tomorrow
  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(tomorrow.toISOString().split('T')[0]);
      setSelectedTime('10:00');
      setMessage('');
      setError(null);
    }
  }, [isOpen]);

  // Get minimum date (today)
  const minDate = new Date().toISOString().split('T')[0];

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const scheduledFor = new Date(`${selectedDate}T${selectedTime}`).toISOString();
      
      const result = await proposeSession({
        partner_id: partnerId,
        scheduled_for: scheduledFor,
        duration,
        message: message.trim() || undefined,
      });

      if (result) {
        onSuccess?.();
        onClose();
      } else {
        setError(sessionError || t.calendar?.proposalFailed || 'Terminvorschlag senden fehlgeschlagen');
      }
    } catch (err) {
      setError(t.calendar?.proposalFailed || 'Terminvorschlag senden fehlgeschlagen');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-700">
          <div className="flex items-center gap-3">
            {partnerAvatar ? (
              <img
                src={partnerAvatar}
                alt={partnerName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <span className="text-amber-700 dark:text-amber-300 font-medium">
                  {partnerName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h2 className="font-medium text-stone-900 dark:text-stone-100">
                {t.calendar?.scheduleWith || 'Termin mit'} {partnerName}
              </h2>
              <p className="text-sm text-stone-500">
                {t.calendar?.proposeSession || 'Session vorschlagen'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Overlapping availability hint */}
          {isLoadingSlots ? (
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t.calendar?.checkingAvailability || 'Pruefe Verfuegbarkeit...'}
            </div>
          ) : overlappingSlots.length > 0 ? (
            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300 font-medium mb-2">
                {t.calendar?.matchingTimes || 'Passende Zeiten gefunden:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {overlappingSlots.slice(0, 5).map((slot, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs"
                  >
                    {weekdays[slot.day_of_week]} {slot.start_time.substring(0, 5)}-{slot.end_time.substring(0, 5)}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t.calendar?.noMatchingTimes || 'Keine ueberlappenden Verfuegbarkeiten gefunden. Du kannst trotzdem einen Termin vorschlagen.'}
              </p>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              <Calendar className="w-4 h-4" />
              {t.calendar?.date || 'Datum'}
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minDate}
              required
              className="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Time */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              <Clock className="w-4 h-4" />
              {t.calendar?.time || 'Uhrzeit'}
            </label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1 block">
              {t.calendar?.duration || 'Dauer'}
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700"
            >
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
              <option value={20}>20 min</option>
              <option value={30}>30 min</option>
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              <MessageSquare className="w-4 h-4" />
              {t.calendar?.message || 'Nachricht'} ({t.calendar?.optional || 'optional'})
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder={t.calendar?.messagePlaceholder || 'Optionale Nachricht an deinen Partner...'}
              className="w-full px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
            >
              {t.calendar?.cancel || 'Abbrechen'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedDate || !selectedTime}
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t.calendar?.sendProposal || 'Vorschlag senden'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
