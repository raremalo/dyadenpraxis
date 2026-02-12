import React, { useState } from 'react';
import { Plus, Trash2, Clock, Loader2 } from 'lucide-react';
import { useAvailability, WEEKDAYS, WEEKDAYS_SHORT, type AvailabilitySlot } from '../hooks/useAvailability';
import { useSettings } from '../contexts/SettingsContext';
import { translations } from '../translations';

interface AvailabilitySlotEditorProps {
  onSave?: () => void;
}

export default function AvailabilitySlotEditor({ onSave }: AvailabilitySlotEditorProps) {
  const { language } = useSettings();
  const t = translations[language];
  const weekdays = WEEKDAYS[language];
  const weekdaysShort = WEEKDAYS_SHORT[language];
  
  const {
    slots,
    isLoading,
    error,
    createSlot,
    updateSlot,
    deleteSlot,
    toggleSlotActive,
  } = useAvailability();

  const [isAdding, setIsAdding] = useState(false);
  const [newSlot, setNewSlot] = useState({
    day_of_week: 1, // Monday
    start_time: '09:00',
    end_time: '12:00',
  });
  const [savingId, setSavingId] = useState<string | null>(null);

  // Group slots by day
  const slotsByDay = slots.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) {
      acc[slot.day_of_week] = [];
    }
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {} as Record<number, AvailabilitySlot[]>);

  // Handle add new slot
  const handleAddSlot = async () => {
    setSavingId('new');
    const result = await createSlot({
      day_of_week: newSlot.day_of_week,
      start_time: newSlot.start_time + ':00',
      end_time: newSlot.end_time + ':00',
    });
    
    if (result) {
      setIsAdding(false);
      setNewSlot({ day_of_week: 1, start_time: '09:00', end_time: '12:00' });
      onSave?.();
    }
    setSavingId(null);
  };

  // Handle toggle active
  const handleToggle = async (slotId: string) => {
    setSavingId(slotId);
    await toggleSlotActive(slotId);
    setSavingId(null);
  };

  // Handle delete
  const handleDelete = async (slotId: string) => {
    setSavingId(slotId);
    await deleteSlot(slotId);
    setSavingId(null);
  };

  // Format time for display
  const formatTime = (time: string) => {
    return time.substring(0, 5); // HH:MM from HH:MM:SS
  };

  if (isLoading && slots.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100">
          {t.calendar?.availability || 'Verfuegbarkeit'}
        </h3>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.calendar?.addSlot || 'Hinzufuegen'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Add new slot form */}
      {isAdding && (
        <div className="p-4 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Day selection */}
            <div>
              <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">
                {t.calendar?.day || 'Tag'}
              </label>
              <select
                value={newSlot.day_of_week}
                onChange={(e) => setNewSlot(prev => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-sm"
              >
                {weekdays.map((day, idx) => (
                  <option key={idx} value={idx}>{day}</option>
                ))}
              </select>
            </div>

            {/* Start time */}
            <div>
              <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">
                {t.calendar?.from || 'Von'}
              </label>
              <input
                type="time"
                value={newSlot.start_time}
                onChange={(e) => setNewSlot(prev => ({ ...prev, start_time: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-sm"
              />
            </div>

            {/* End time */}
            <div>
              <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">
                {t.calendar?.to || 'Bis'}
              </label>
              <input
                type="time"
                value={newSlot.end_time}
                onChange={(e) => setNewSlot(prev => ({ ...prev, end_time: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <button
                onClick={handleAddSlot}
                disabled={savingId === 'new'}
                className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm"
              >
                {savingId === 'new' ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  t.calendar?.save || 'Speichern'
                )}
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="px-3 py-2 bg-stone-200 dark:bg-stone-600 text-stone-700 dark:text-stone-200 rounded-lg hover:bg-stone-300 dark:hover:bg-stone-500 text-sm"
              >
                {t.calendar?.cancel || 'Abbrechen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slots list grouped by day */}
      {slots.length === 0 && !isAdding ? (
        <div className="text-center py-8 text-stone-500 dark:text-stone-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t.calendar?.noSlots || 'Keine Verfuegbarkeiten eingetragen'}</p>
          <p className="text-sm mt-1">{t.calendar?.addFirst || 'Fuege deine erste Verfuegbarkeit hinzu'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5, 6].map(day => {
            const daySlots = slotsByDay[day] || [];
            if (daySlots.length === 0) return null;
            
            return (
              <div key={day} className="bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden">
                <div className="px-4 py-2 bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700">
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {weekdays[day]}
                  </span>
                </div>
                <div className="divide-y divide-stone-100 dark:divide-stone-700">
                  {daySlots.map(slot => (
                    <div
                      key={slot.id}
                      className={`flex items-center justify-between px-4 py-3 ${
                        !slot.is_active ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-stone-400" />
                        <span className="text-stone-900 dark:text-stone-100">
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Active toggle */}
                        <button
                          onClick={() => handleToggle(slot.id)}
                          disabled={savingId === slot.id}
                          className={`relative w-10 h-6 rounded-full transition-colors ${
                            slot.is_active 
                              ? 'bg-amber-600' 
                              : 'bg-stone-300 dark:bg-stone-600'
                          }`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            slot.is_active ? 'left-5' : 'left-1'
                          }`} />
                        </button>
                        
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(slot.id)}
                          disabled={savingId === slot.id}
                          className="p-1.5 text-stone-400 hover:text-red-500 transition-colors"
                        >
                          {savingId === slot.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
