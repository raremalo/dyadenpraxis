import React from 'react';
import { X } from 'lucide-react';
import type { StatefulDevice } from '@daily-co/daily-react';
import { useSettings } from '../../contexts/SettingsContext';

interface VideoSettingsPanelProps {
  panelRef: React.RefObject<HTMLDivElement | null>;
  cameras: StatefulDevice[];
  microphones: StatefulDevice[];
  speakers: StatefulDevice[];
  currentCam: StatefulDevice | undefined;
  currentMic: StatefulDevice | undefined;
  currentSpeaker: StatefulDevice | undefined;
  setCamera: (deviceId: string) => Promise<void>;
  setMicrophone: (deviceId: string) => Promise<void>;
  setSpeaker: (deviceId: string) => Promise<void>;
  bgEffect: 'none' | 'blur';
  onToggleBackgroundBlur: () => void;
  noiseCancellation: boolean;
  onToggleNoiseCancellation: () => void;
  onClose: () => void;
}

/**
 * VideoSettingsPanel — device selection (camera/mic/speaker) + background blur
 * + noise cancellation overlay. Extracted from VideoRoom.tsx (Phase 6). No logic change.
 */
const VideoSettingsPanel: React.FC<VideoSettingsPanelProps> = ({
  panelRef, cameras, microphones, speakers,
  currentCam, currentMic, currentSpeaker,
  setCamera, setMicrophone, setSpeaker,
  bgEffect, onToggleBackgroundBlur,
  noiseCancellation, onToggleNoiseCancellation, onClose,
}) => {
  const { t } = useSettings();

  return (
    <div ref={panelRef} className="absolute bottom-20 left-4 right-4 bg-[var(--c-bg-card)] rounded-2xl border border-[var(--c-border)] shadow-xl p-5 space-y-5 z-20 max-h-[60vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[var(--c-text-main)] uppercase tracking-widest">{t.video?.settings || 'Einstellungen'}</h4>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--c-bg-app)] transition-colors">
          <X className="w-4 h-4 text-[var(--c-text-muted)]" />
        </button>
      </div>

      {cameras.length > 0 && (
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[var(--c-text-muted)]">{t.video?.camera || 'Kamera'}</label>
          <select
            value={currentCam?.device?.deviceId || ''}
            onChange={(e) => setCamera(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--c-bg-app)] text-[var(--c-text-main)] border border-[var(--c-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--c-accent)]"
          >
            {cameras.map((cam) => (
              <option key={cam.device.deviceId} value={cam.device.deviceId}>
                {cam.device.label || 'Kamera'}
              </option>
            ))}
          </select>
        </div>
      )}

      {microphones.length > 0 && (
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[var(--c-text-muted)]">{t.video?.microphone || 'Mikrofon'}</label>
          <select
            value={currentMic?.device?.deviceId || ''}
            onChange={(e) => setMicrophone(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--c-bg-app)] text-[var(--c-text-main)] border border-[var(--c-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--c-accent)]"
          >
            {microphones.map((mic) => (
              <option key={mic.device.deviceId} value={mic.device.deviceId}>
                {mic.device.label || 'Mikrofon'}
              </option>
            ))}
          </select>
        </div>
      )}

      {speakers.length > 0 && (
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[var(--c-text-muted)]">{t.video?.speaker || 'Lautsprecher'}</label>
          <select
            value={currentSpeaker?.device?.deviceId || ''}
            onChange={(e) => setSpeaker(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--c-bg-app)] text-[var(--c-text-main)] border border-[var(--c-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--c-accent)]"
          >
            {speakers.map((spk) => (
              <option key={spk.device.deviceId} value={spk.device.deviceId}>
                {spk.device.label || 'Lautsprecher'}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-[var(--c-text-muted)]">{t.video?.background || 'Hintergrund'}</label>
        <div className="flex gap-2">
          <button
            onClick={() => { if (bgEffect !== 'none') onToggleBackgroundBlur(); }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              bgEffect === 'none'
                ? 'bg-[var(--c-accent)] text-[var(--c-accent-fg)]'
                : 'bg-[var(--c-bg-app)] text-[var(--c-text-muted)] hover:text-[var(--c-text-main)]'
            }`}
          >
            {t.video?.bgNone || 'Keiner'}
          </button>
          <button
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              bgEffect === 'blur'
                ? 'bg-[var(--c-accent)] text-[var(--c-accent-fg)]'
                : 'bg-[var(--c-bg-app)] text-[var(--c-text-muted)] hover:text-[var(--c-text-main)]'
            }`}
            onClick={() => { if (bgEffect !== 'blur') onToggleBackgroundBlur(); }}
          >
            {t.video?.bgBlur || 'Blur'}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-[var(--c-text-muted)]">{t.video?.noiseCancellation || 'Rauschunterdrueckung'}</label>
        <button
          onClick={onToggleNoiseCancellation}
          className={`w-full py-2 rounded-xl text-sm font-medium transition-colors ${
            noiseCancellation
              ? 'bg-[var(--c-accent)] text-[var(--c-accent-fg)]'
              : 'bg-[var(--c-bg-app)] text-[var(--c-text-muted)] hover:text-[var(--c-text-main)]'
          }`}
        >
          {noiseCancellation ? (t.video?.ncOn || 'Aktiv') : (t.video?.ncOff || 'Aus')}
        </button>
      </div>
    </div>
  );
};

export default VideoSettingsPanel;
