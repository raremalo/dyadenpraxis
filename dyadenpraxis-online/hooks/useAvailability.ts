import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface AvailabilitySlot {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  day_of_week: number; // 0 = Sonntag, 1 = Montag, ..., 6 = Samstag
  start_time: string; // HH:MM:SS format
  end_time: string;
  is_active: boolean;
}

export interface AvailabilitySlotInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

// Wochentag-Namen
export const WEEKDAYS = {
  de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

export const WEEKDAYS_SHORT = {
  de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

interface UseAvailabilityReturn {
  // Data
  slots: AvailabilitySlot[];
  isLoading: boolean;
  error: string | null;
  
  // Own slots
  loadMySlots: () => Promise<void>;
  createSlot: (slot: AvailabilitySlotInput) => Promise<AvailabilitySlot | null>;
  updateSlot: (slotId: string, updates: Partial<AvailabilitySlotInput>) => Promise<boolean>;
  deleteSlot: (slotId: string) => Promise<boolean>;
  toggleSlotActive: (slotId: string) => Promise<boolean>;
  
  // Partner slots
  loadPartnerSlots: (partnerId: string) => Promise<AvailabilitySlot[]>;
  
  // Matching
  findOverlappingSlots: (partnerId: string) => Promise<OverlappingSlot[]>;
}

export interface OverlappingSlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  mySlot: AvailabilitySlot;
  partnerSlot: AvailabilitySlot;
}

export function useAvailability(): UseAvailabilityReturn {
  const { user } = useAuth();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load own availability slots
  const loadMySlots = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (fetchError) throw new Error(fetchError.message);
      setSlots(data || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verfuegbarkeiten laden fehlgeschlagen';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Create new availability slot
  const createSlot = useCallback(async (slot: AvailabilitySlotInput): Promise<AvailabilitySlot | null> => {
    if (!user) return null;
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('availability_slots')
        .insert({
          user_id: user.id,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_active: slot.is_active ?? true,
        })
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);
      
      // Update local state
      setSlots(prev => [...prev, data].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
        return a.start_time.localeCompare(b.start_time);
      }));
      
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Zeitslot erstellen fehlgeschlagen';
      setError(msg);
      return null;
    }
  }, [user]);

  // Update availability slot
  const updateSlot = useCallback(async (slotId: string, updates: Partial<AvailabilitySlotInput>): Promise<boolean> => {
    if (!user) return false;
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('availability_slots')
        .update(updates)
        .eq('id', slotId)
        .eq('user_id', user.id);

      if (updateError) throw new Error(updateError.message);
      
      // Update local state
      setSlots(prev => prev.map(s => 
        s.id === slotId ? { ...s, ...updates } : s
      ));
      
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Zeitslot aktualisieren fehlgeschlagen';
      setError(msg);
      return false;
    }
  }, [user]);

  // Delete availability slot
  const deleteSlot = useCallback(async (slotId: string): Promise<boolean> => {
    if (!user) return false;
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('availability_slots')
        .delete()
        .eq('id', slotId)
        .eq('user_id', user.id);

      if (deleteError) throw new Error(deleteError.message);
      
      // Update local state
      setSlots(prev => prev.filter(s => s.id !== slotId));
      
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Zeitslot loeschen fehlgeschlagen';
      setError(msg);
      return false;
    }
  }, [user]);

  // Toggle slot active status
  const toggleSlotActive = useCallback(async (slotId: string): Promise<boolean> => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return false;
    
    return updateSlot(slotId, { is_active: !slot.is_active });
  }, [slots, updateSlot]);

  // Load partner's availability slots
  const loadPartnerSlots = useCallback(async (partnerId: string): Promise<AvailabilitySlot[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('user_id', partnerId)
        .eq('is_active', true)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (fetchError) throw new Error(fetchError.message);
      return data || [];
    } catch (err) {
      console.error('Partner slots laden fehlgeschlagen:', err);
      return [];
    }
  }, []);

  // Find overlapping time slots between current user and partner
  const findOverlappingSlots = useCallback(async (partnerId: string): Promise<OverlappingSlot[]> => {
    if (!user) return [];

    try {
      // Load both users' active slots
      const [myActiveSlots, partnerSlots] = await Promise.all([
        supabase
          .from('availability_slots')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true),
        loadPartnerSlots(partnerId),
      ]);

      const mySlots = myActiveSlots.data || [];
      const overlapping: OverlappingSlot[] = [];

      // Find overlaps
      for (const mySlot of mySlots) {
        for (const partnerSlot of partnerSlots) {
          // Same day?
          if (mySlot.day_of_week !== partnerSlot.day_of_week) continue;

          // Calculate overlap
          const myStart = mySlot.start_time;
          const myEnd = mySlot.end_time;
          const partnerStart = partnerSlot.start_time;
          const partnerEnd = partnerSlot.end_time;

          // Check if there's an overlap
          if (myStart < partnerEnd && myEnd > partnerStart) {
            const overlapStart = myStart > partnerStart ? myStart : partnerStart;
            const overlapEnd = myEnd < partnerEnd ? myEnd : partnerEnd;

            overlapping.push({
              day_of_week: mySlot.day_of_week,
              start_time: overlapStart,
              end_time: overlapEnd,
              mySlot,
              partnerSlot,
            });
          }
        }
      }

      // Sort by day and time
      return overlapping.sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
        return a.start_time.localeCompare(b.start_time);
      });
    } catch (err) {
      console.error('Ueberlappungen finden fehlgeschlagen:', err);
      return [];
    }
  }, [user, loadPartnerSlots]);

  // Load slots on mount
  useEffect(() => {
    if (user) {
      loadMySlots();
    }
  }, [user, loadMySlots]);

  return {
    slots,
    isLoading,
    error,
    loadMySlots,
    createSlot,
    updateSlot,
    deleteSlot,
    toggleSlotActive,
    loadPartnerSlots,
    findOverlappingSlots,
  };
}
