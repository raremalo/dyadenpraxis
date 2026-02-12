import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface UseAvatarUploadOptions {
  userId: string;
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
}

interface UseAvatarUploadReturn {
  uploading: boolean;
  error: string | null;
  uploadAvatar: (file: File) => Promise<string | null>;
  deleteAvatar: () => Promise<boolean>;
}

const MAX_SIZE = 400;
const QUALITY = 0.8;
const BUCKET = 'avatars';

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context nicht verfuegbar'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // Skalierung berechnen
      if (width > height) {
        if (width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Bild zeichnen und komprimieren
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Bild-Komprimierung fehlgeschlagen'));
          }
        },
        'image/jpeg',
        QUALITY
      );
    };

    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
    img.src = URL.createObjectURL(file);
  });
}

export function useAvatarUpload({
  userId,
  onSuccess,
  onError,
}: UseAvatarUploadOptions): UseAvatarUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    if (!userId) {
      setError('Nicht angemeldet');
      return null;
    }

    // Validierung
    if (!file.type.startsWith('image/')) {
      const msg = 'Nur Bilddateien erlaubt';
      setError(msg);
      onError?.(msg);
      return null;
    }

    if (file.size > 10 * 1024 * 1024) {
      const msg = 'Datei zu gross (max 10MB)';
      setError(msg);
      onError?.(msg);
      return null;
    }

    setUploading(true);
    setError(null);

    try {
      // Bild komprimieren
      const compressed = await compressImage(file);

      // Dateiname: {userId}/avatar.jpg
      const filePath = `${userId}/avatar.jpg`;

      // Alte Datei loeschen (falls vorhanden)
      await supabase.storage.from(BUCKET).remove([filePath]);

      // Neue Datei hochladen
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, compressed, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Public URL generieren
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

      // Cache-Busting Parameter hinzufuegen
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      // Profil aktualisieren
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBust })
        .eq('id', userId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      onSuccess?.(urlWithCacheBust);
      return urlWithCacheBust;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload fehlgeschlagen';
      setError(msg);
      onError?.(msg);
      return null;
    } finally {
      setUploading(false);
    }
  }, [userId, onSuccess, onError]);

  const deleteAvatar = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      setError('Nicht angemeldet');
      return false;
    }

    setUploading(true);
    setError(null);

    try {
      const filePath = `${userId}/avatar.jpg`;

      // Datei loeschen
      const { error: deleteError } = await supabase.storage
        .from(BUCKET)
        .remove([filePath]);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Profil aktualisieren
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      onSuccess?.('');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Loeschen fehlgeschlagen';
      setError(msg);
      onError?.(msg);
      return false;
    } finally {
      setUploading(false);
    }
  }, [userId, onSuccess, onError]);

  return {
    uploading,
    error,
    uploadAvatar,
    deleteAvatar,
  };
}
