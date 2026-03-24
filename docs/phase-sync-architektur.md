# Architektur-Dokumentation: Phase-Sync + Gong-Sync via Daily.co AppMessage

## Kontext

In der Dyaden-Praxis App starten zwei Teilnehmer eine Video-Session. Einer startet den Timer, der die Rollen (Sprecher/Zuhörer) wechselt. Das Problem: Der Timer läuft **nur lokal** beim Starter. Der Partner sieht weder die aktuelle Phase noch hört er den Gong.

**Lösung**: Synchronisation über `useAppMessage` von `@daily-co/daily-react` — ein Peer-to-Peer Messaging-Kanal innerhalb des Daily.co Video-Rooms.

---

## Architektur-Übersicht (3 Schichten)

```
┌─────────────────────────────────────────────────────┐
│  Schicht 3: Session-Orchestrator (ActiveSession)    │
│  → Betreibt den Timer-Hook                          │
│  → Leitet Props an VideoRoom weiter                 │
│  → Empfängt Remote-Callbacks                        │
├─────────────────────────────────────────────────────┤
│  Schicht 2: Video-Komponente (VideoRoom)            │
│  → "Sync-Bridge" zwischen Timer und Partner         │
│  → Sendet AppMessages bei Phase-Änderungen          │
│  → Empfängt AppMessages und spiegelt Rollen         │
│  → Spielt Remote-Gong ab                            │
├─────────────────────────────────────────────────────┤
│  Schicht 1: Lokaler Timer-Hook (useDyadTimerEngine) │
│  → Rein lokal, keine Netzwerk-Awareness             │
│  → State-Machine für Phasen-Übergänge               │
│  → Spielt Gong lokal ab                             │
└─────────────────────────────────────────────────────┘
```

---

## Schicht 1: Lokaler Timer-Hook

**Datei**: `hooks/useDyadTimerEngine.ts`

### Rollen-Enum
```ts
enum DyadRole {
  SPEAKER = 'SPEAKER',         // Sprecher
  LISTENER = 'LISTENER',       // Zuhörer
  CONTEMPLATION = 'CONTEMPLATION', // Stille Besinnung (vor Beginn)
  TRANSITION = 'TRANSITION',   // Kurze Pause zwischen Rollen
  COMPLETED = 'COMPLETED',     // Timer beendet
}
```

### Timer-Konfiguration
```ts
interface DyadConfig {
  durationMinutes: number;       // Dauer pro Rolle (Sprechen/Zuhören)
  contemplationMinutes: number;  // Kontemplationszeit am Anfang
  transitionSeconds: number;     // Übergangszeit (0, 10, 20, 30 Sek.)
  rounds: number;                // Anzahl Runden (1 Runde = 1× Sprechen + 1× Zuhören)
  soundUrl: string;              // URL des Gong-Sounds
}
```

### Phasen-Ablauf
```
CONTEMPLATION → SPEAKER → (TRANSITION) → LISTENER → (TRANSITION) → SPEAKER → ... → COMPLETED
                                                                     ↑ nächste Runde
```

### Gong wird gespielt bei
1. **Eingangsgong**: Beim Timer-Start (mit 100ms Delay)
2. **Jede Transition**: Wenn eine Phase endet → `playBell()` wird aufgerufen
3. **Endgong**: Wenn COMPLETED erreicht wird

### Gong-Implementierung (lokal)
```ts
const audioRef = useRef<HTMLAudioElement | null>(null);

// Beim Timer-Start: Audio-Element erstellen
const startTimer = (cfg: DyadConfig) => {
  audioRef.current = new Audio(cfg.soundUrl);
  // ... Timer-Logik ...
  // Eingangsgong mit kurzem Delay
  setTimeout(() => {
    audioRef.current?.play();
  }, 100);
};

// Bei jeder Transition
const playBell = () => {
  if (audioRef.current) {
    audioRef.current.currentTime = 0;
    audioRef.current.play();
  }
};
```

### Was der Hook zurückgibt
```ts
{
  config: DyadConfig | null,
  currentRole: DyadRole,         // ← Aktuelle Phase (SPEAKER, LISTENER, etc.)
  timeLeft: number,              // ← Verbleibende Sekunden in aktueller Phase
  isTimerRunning: boolean,       // ← Läuft der Timer?
  totalTimerSeconds: number,     // ← Gesamtdauer des Timers
  playBell: () => void,          // ← Gong manuell abspielen
  // ... start, stop, pause, resume
}
```

**Kernprinzip**: Dieser Hook hat KEINE Netzwerk-Awareness. Er weiß nichts von Daily.co, AppMessages oder einem Partner. Alles rein lokal.

---

## Schicht 2: Video-Komponente (Sync-Bridge)

**Datei**: `components/VideoRoom.tsx`

### Props (von ActiveSession)
```ts
interface VideoRoomProps {
  currentPhase?: DyadRole;       // Lokale Phase vom Timer-Hook
  phaseSoundUrl?: string;        // Gong-Sound URL
  sessionTimeLeft?: number | null;  // Session-Countdown in Sekunden
  onRemoteSessionEnding?: (secondsLeft: number) => void;  // Callback für Partner
  // ... weitere Video-Props (roomUrl, token, etc.)
}
```

### 3 AppMessage-Typen

| Typ | Payload | Wann gesendet | Wirkung beim Partner |
|-----|---------|---------------|---------------------|
| `phase` | `{ role, soundUrl }` | Bei jeder Phasen-Änderung | Rolle spiegeln + Gong abspielen |
| `phase-stop` | — | Timer gestoppt | Phase-Anzeige ausblenden |
| `session-ending` | `{ secondsLeft }` | Letzte 60 Sek., jede Sekunde | Countdown-Banner anzeigen |

### Kern-Implementierung

#### 1. State + Audio-Ref für Remote-Gong
```ts
const [remotePhase, setRemotePhase] = useState<DyadRole | null>(null);
const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

const playRemoteGong = useCallback((soundUrl: string) => {
  // Audio-Element wiederverwenden wenn gleiche URL
  if (!remoteAudioRef.current || remoteAudioRef.current.src !== soundUrl) {
    remoteAudioRef.current = new Audio(soundUrl);
  }
  remoteAudioRef.current.currentTime = 0;
  remoteAudioRef.current.play().catch(console.log);
}, []);
```

#### 2. AppMessage Handler (Empfangen)
```ts
const sendAppMessage = useAppMessage({
  onAppMessage: useCallback((ev) => {
    if (ev.data?.type === 'phase') {
      const role = ev.data.role as DyadRole;

      // ★ SPIEGELUNG: Partner sieht inverse Rolle
      if (role === DyadRole.SPEAKER) setRemotePhase(DyadRole.LISTENER);
      else if (role === DyadRole.LISTENER) setRemotePhase(DyadRole.SPEAKER);
      else setRemotePhase(role);  // CONTEMPLATION, TRANSITION, COMPLETED: nicht spiegeln

      // ★ GONG: Sound-URL abspielen
      if (ev.data.soundUrl) playRemoteGong(ev.data.soundUrl);

    } else if (ev.data?.type === 'phase-stop') {
      setRemotePhase(null);

    } else if (ev.data?.type === 'session-ending') {
      onRemoteSessionEnding?.(ev.data.secondsLeft);
    }
  }, [playRemoteGong, onRemoteSessionEnding]),
});
```

#### 3. Phase senden (bei Änderung)
```ts
useEffect(() => {
  if (!daily || meetingState !== 'joined-meeting') return;
  if (currentPhase) {
    sendAppMessage({ type: 'phase', role: currentPhase, soundUrl: phaseSoundUrl || '' }, '*');
  } else {
    sendAppMessage({ type: 'phase-stop' }, '*');
  }
}, [currentPhase, phaseSoundUrl, daily, meetingState, sendAppMessage]);
```

#### 4. Session-Ending Countdown senden
```ts
useEffect(() => {
  if (!daily || meetingState !== 'joined-meeting') return;
  if (sessionTimeLeft != null && sessionTimeLeft <= 60 && sessionTimeLeft > 0) {
    sendAppMessage({ type: 'session-ending', secondsLeft: sessionTimeLeft }, '*');
  }
}, [sessionTimeLeft, daily, meetingState, sendAppMessage]);
```

#### 5. Effective Phase (lokale Priorität)
```ts
// Timer-Starter hat currentPhase (lokal) → nutzt diese
// Partner hat nur remotePhase (empfangen) → nutzt diese
const effectivePhase = currentPhase || remotePhase;
```

### UI-Darstellung

#### Phase-Indicator Button (im Video-Toolbar)
```tsx
{effectivePhase && (
  <div className={`p-3 rounded-full ${
    effectivePhase === DyadRole.SPEAKER
      ? 'bg-orange-500 text-white'     // Orange = Sprecher
      : effectivePhase === DyadRole.LISTENER
      ? 'bg-blue-500 text-white'       // Blau = Zuhörer
      : ''
  }`}>
    {effectivePhase === DyadRole.SPEAKER
      ? <MessageCircle className="w-5 h-5" />  // Sprechblasen-Icon
      : <Ear className="w-5 h-5" />            // Ohr-Icon
    }
  </div>
)}
```

#### Video-Container Border-Effekt
```tsx
<div className={`... ${
  effectivePhase === DyadRole.SPEAKER
    ? 'shadow-[inset_0_0_0_4px_rgba(249,115,22,0.5)]'  // Orange Rand
    : effectivePhase === DyadRole.LISTENER
    ? 'shadow-[inset_0_0_0_4px_rgba(59,130,246,0.5)]'  // Blau Rand
    : ''
}`}>
```

---

## Schicht 3: Session-Orchestrator

**Datei**: `components/ActiveSession.tsx`

### Props an VideoRoom weiterreichen
```tsx
<VideoRoom
  currentPhase={dyadTimer.isTimerRunning ? dyadTimer.currentRole : undefined}
  phaseSoundUrl={dyadTimer.config?.soundUrl}
  sessionTimeLeft={sessionTimeLeft}
  onRemoteSessionEnding={(secondsLeft) => {
    // ★ GUARD: Nur wenn KEIN eigener Timer läuft (= ich bin der Partner)
    if (!dyadTimer.isTimerRunning) {
      setSessionTimeLeft(secondsLeft);
      setShowEndingBanner(true);
    }
  }}
/>
```

### Session-Ending Banner
```tsx
{showEndingBanner && sessionTimeLeft !== null && (
  <div className="mb-3 px-4 py-3 bg-stone-100 dark:bg-stone-800 border
    border-stone-300 dark:border-stone-600 rounded-xl flex items-center
    justify-center gap-2 text-stone-700 dark:text-stone-200 text-sm font-medium">
    <Clock className="w-4 h-4" />
    Die Sitzung endet in {sessionTimeLeft} Sekunden
  </div>
)}
```

---

## Datenfluss-Diagramm

```
TIMER-STARTER (Browser A)                    PARTNER (Browser B)
━━━━━━━━━━━━━━━━━━━━━━━━                    ━━━━━━━━━━━━━━━━━━

useDyadTimerEngine
  ↓ currentRole = SPEAKER
  ↓ playBell() → 🔔 Gong lokal

ActiveSession
  ↓ currentPhase = SPEAKER
  ↓ phaseSoundUrl = "/gong.mp3"

VideoRoom                                   VideoRoom
  ↓ useEffect erkennt Phase-Änderung          ↓ useAppMessage empfängt
  ↓ sendAppMessage({                          ↓ { type: 'phase',
  ↓   type: 'phase',           ──────────►    ↓   role: 'SPEAKER',
  ↓   role: 'SPEAKER',        Daily.co P2P   ↓   soundUrl: '/gong.mp3' }
  ↓   soundUrl: '/gong.mp3'                  ↓
  ↓ }, '*')                                   ↓ ★ SPIEGELUNG:
                                              ↓ SPEAKER → setRemotePhase(LISTENER)
                                              ↓
                                              ↓ ★ GONG:
                                              ↓ playRemoteGong('/gong.mp3') → 🔔
                                              ↓
                                              ↓ effectivePhase = LISTENER
                                              ↓ → Ohr-Icon (blau) anzeigen

UI bei Starter:                              UI bei Partner:
  🟠 MessageCircle (Sprecher)                  🔵 Ear (Zuhörer)
  Orange Rand um Video                         Blauer Rand um Video
  🔔 Gong (lokal)                              🔔 Gong (remote, gleicher Sound)
```

---

## Kernprinzipien (für Übertragung auf andere App)

1. **Single Source of Truth**: Nur EIN Teilnehmer betreibt den Timer
2. **Unidirektionaler Sync**: Timer-Starter → Partner (nicht umgekehrt)
3. **Rollen-Spiegelung**: SPEAKER↔LISTENER invertiert, andere Phasen unverändert
4. **Sound-Sync via URL**: Nicht den Sound streamen, sondern die URL senden und beim Partner lokal abspielen
5. **Guard gegen Self-Update**: Timer-Starter ignoriert Remote-Messages (Daily.co's `useAppMessage` liefert nur Remote-Nachrichten, nie eigene)
6. **Guard im Callback**: `if (!timer.isRunning)` verhindert dass der Timer-Starter seine eigenen Werte überschreibt
7. **effectivePhase = local || remote**: Lokale Phase hat immer Priorität

---

## Checkliste für Übertragung auf andere App

### Was du brauchst
- [ ] Video-Call SDK mit P2P Messaging (Daily.co, Twilio, LiveKit, etc.)
- [ ] Rollen-Enum definieren
- [ ] Timer-Config Interface (Dauer, Runden, Sound-URL)
- [ ] Lokaler Timer-Hook (State-Machine für Phasen)

### Implementierungs-Schritte
1. [ ] Timer-Hook erstellen (rein lokal, keine Netzwerk-Logik)
2. [ ] AppMessage-Typen definieren (`phase`, `phase-stop`, `session-ending`)
3. [ ] In Video-Komponente: `useAppMessage` (oder SDK-Äquivalent) einbinden
4. [ ] Sende-Effects: Bei Phase-Änderung + Bei Countdown ≤60s
5. [ ] Empfangs-Handler: Rolle spiegeln + Gong abspielen + Callbacks
6. [ ] `effectivePhase = local || remote` Pattern implementieren
7. [ ] UI: Phase-Indicator mit farbigen Icons
8. [ ] UI: Session-Ending Banner
9. [ ] Guard-Logik: Remote-Events nur verarbeiten wenn eigener Timer NICHT läuft

### Abhängigkeiten (dyaden-praxis spezifisch)
- `@daily-co/daily-react`: `useAppMessage`, `useDaily`, `useMeetingState`
- `lucide-react`: `Ear`, `MessageCircle`, `Clock` Icons
- Tailwind CSS für Styling
