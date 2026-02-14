# Daily.co Video-Integration

## Architektur

```
User klickt "Session starten"
  → SessionContext.startVideoSession()
    → useVideoCall.createRoom(sessionId)
      → Supabase Edge Function "create-room"
        → Daily REST API: POST /rooms + POST /meeting-tokens
      ← { roomUrl, tokens: { requester, partner, third? } }
    → useSession.startSession(sessionId, roomUrl, tokens...)
      → DB Update: status='active', room_url, tokens
      ← Session objekt (direkt, kein loadSessions — Race-Condition-Vermeidung)
    → State: setCurrentSession, setVideoRoomUrl, setVideoToken
  → ActiveSession rendert VideoRoom
    → <DailyProvider url={roomUrl} token={meetingToken}>
      → <VideoUI /> (alle Daily-Hooks verfügbar)
      → <DailyAudio /> (Remote-Audio automatisch)
    → Auto-Join bei Mount via daily.join()
```

## Dateien-Map

| Datei | Verantwortung |
|-------|---------------|
| `hooks/useVideoCall.ts` | `createRoom()` — ruft Edge Function auf, gibt roomUrl + Tokens zurück |
| `supabase/functions/create-room/index.ts` | Edge Function — Daily REST API (Room + Tokens erstellen) |
| `contexts/SessionContext.tsx` | `startVideoSession()` — orchestriert Room-Erstellung + DB-Update + State |
| `hooks/useSession.ts` | `startSession()` / `startTriadSession()` — DB-Update, gibt Session zurück |
| `components/VideoRoom.tsx` | `<DailyProvider>` Wrapper + `<VideoUI>` mit allen Daily-Hooks |
| `components/ActiveSession.tsx` | Session-Orchestrator — Timer, Countdown, Auto-End, Prompt-Overlay |

## Edge Function: create-room

**Pfad:** `supabase/functions/create-room/index.ts`

### Room erstellen

```
POST https://api.daily.co/v1/rooms
Headers: Authorization: Bearer {DAILY_API_KEY}
Body: {
  name: "dyade-{sessionId.slice(0,8)}-{timestamp}",
  properties: {
    exp: Math.floor(Date.now()/1000) + (duration + 5) * 60,
    max_participants: includeThird ? 3 : 2,
    enable_chat: false,
    enable_knocking: false,
    start_video_off: false,
    start_audio_off: false
  }
}
Response: { url: "https://xxx.daily.co/roomName", name: "roomName", ... }
```

### Meeting-Token erstellen

```
POST https://api.daily.co/v1/meeting-tokens
Headers: Authorization: Bearer {DAILY_API_KEY}
Body: {
  properties: {
    room_name: roomName,
    user_name: "Teilnehmername aus profiles",
    exp: Math.floor(Date.now()/1000) + expirySeconds
  }
}
Response: { token: "eyJ..." }
```

Pro Teilnehmer wird ein eigener Token erstellt (requester, partner, optional third).

### Auth-Flow

1. JWT aus `Authorization: Bearer` Header extrahieren
2. Supabase `auth.getUser(token)` validiert
3. Session aus DB laden, prüfen ob `requester_id === user.id`
4. `DAILY_API_KEY` aus Environment (`Deno.env.get`)

## useVideoCall Hook

**Pfad:** `hooks/useVideoCall.ts`

```ts
interface CreateRoomResponse {
  roomUrl: string;
  tokens: {
    requester: string;
    partner: string;
    third: string | null;
  };
}

createRoom(sessionId: string, includeThird?: boolean): Promise<CreateRoomResponse | null>
```

- Ruft `supabase.functions.invoke('create-room', { body: { sessionId, includeThird } })` auf
- Auto-Retry bei 401 (Token refresh via `supabase.auth.refreshSession()`)
- `checkMediaPermissions()` — testet `navigator.mediaDevices.getUserMedia`, gibt boolean zurück

## SessionContext: startVideoSession()

**Pfad:** `contexts/SessionContext.tsx`

```ts
const startVideoSession = useCallback(async (): Promise<boolean> => {
  if (!currentSession || !isRequester) return false;
  const isTriad = currentSession.is_open && !!currentSession.third_participant_id;
  const roomData = await createRoom(currentSession.id, isTriad);
  if (!roomData) return false;

  const updatedSession = isTriad && roomData.tokens.third
    ? await startTriadSession(id, roomUrl, tokens...)
    : await startSession(id, roomUrl, tokens...);

  if (updatedSession) {
    setCurrentSession(updatedSession);      // Direkt, kein loadSessions()
    setVideoRoomUrl(roomData.roomUrl);
    setVideoToken(roomData.tokens.requester);
  }
  return !!updatedSession;
}, [...]);
```

**Wichtig:** `startSession()` gibt `Session | null` zurück (nicht boolean). Die Session wird direkt aus dem `.update().select().single()` Response gesetzt — kein separater `loadSessions()` Query. Das verhindert eine Race Condition, bei der der Query ausgeführt wird bevor der Write committed ist.

### Token-Zuweisung (useEffect in SessionContext)

```
activeSession.third_participant_id === user.id → third_participant_token
activeSession.requester_id === user.id        → room_token
sonst (partner)                               → partner_token
```

## Daily React SDK

### Installation

```bash
npm install @daily-co/daily-react @daily-co/daily-js jotai
```

`jotai` ist Peer-Dependency von `@daily-co/daily-react`.

### Komponenten

#### DailyProvider

Kontext-Provider, muss alle Daily-Hooks umschließen.

**Creation Mode** (unser Projekt):
```tsx
<DailyProvider url={roomUrl} token={meetingToken}>
  <VideoUI />
  <DailyAudio />
</DailyProvider>
```

Props (Creation Mode): `url`, `token`, `userName`, `audioSource`, `videoSource`, `subscribeToTracksAutomatically`

**CallObject Mode** (fortgeschritten):
```tsx
const callObject = DailyIframe.createCallObject();
<DailyProvider callObject={callObject}>...</DailyProvider>
```

#### DailyAudio

Rendert automatisch Audio für alle Remote-Teilnehmer. Einmal innerhalb von `<DailyProvider>` platzieren.

```tsx
<DailyAudio />
```

#### DailyVideo

Rendert `<video>` Element für einen Teilnehmer.

```tsx
<DailyVideo
  sessionId={participantSessionId}  // required
  automirror                         // lokales Video spiegeln
  fit="cover"                        // 'contain' | 'cover'
  mirror={false}
  type="video"                       // 'video' | 'screenVideo'
  style={{ ... }}
/>
```

### Hooks — Wichtigste

| Hook | Return | Verwendung |
|------|--------|------------|
| `useDaily()` | `DailyCall` | Call-Instanz für `daily.join()`, `daily.leave()`, `daily.setLocalAudio()`, etc. |
| `useMeetingState()` | `string` | `'new'`, `'joining-meeting'`, `'joined-meeting'`, `'left-meeting'`, `'error'` |
| `useLocalSessionId()` | `string` | Session-ID des lokalen Teilnehmers |
| `useParticipantIds({ filter })` | `string[]` | Array von Session-IDs. Filter: `'remote'`, `'local'`, oder custom function |
| `useDailyEvent(event, callback)` | void | Event-Listener: `'joined-meeting'`, `'left-meeting'`, `'participant-joined'`, etc. |
| `useDailyError()` | `{ meetingError }` | Fehler-Objekt |
| `useInputSettings()` | `{ inputSettings, updateInputSettings }` | Audio/Video Input-Konfiguration |
| `useDevices()` | `{ cameras, microphones, speakers, ... }` | Verfügbare Geräte + Auswahl |

### Hooks — Vollständige Liste

useActiveParticipant, useActiveSpeakerId, useAppMessage, useAudioLevel, useAudioLevelObserver, useCPULoad, useCallFrame, useCallObject, useDaily, useDailyError, useDailyEvent, useDevices, useInputSettings, useLiveStreaming, useLocalParticipant, useLocalSessionId, useMediaTrack, useMeetingSessionState, useMeetingState, useNetwork, useParticipant, useParticipantCounts, useParticipantIds, useParticipantProperty, usePermissions, useReceiveSettings, useRecording, useRoom, useRoomExp, useScreenShare, useSendSettings, useThrottledDailyEvent, useTranscription, useWaitingParticipants

## VideoRoom Patterns

**Pfad:** `components/VideoRoom.tsx`

### Auto-Join

```ts
useEffect(() => {
  if (!daily || meetingState !== 'new') return;
  daily.join().catch(err => onError?.(err.message));
}, [daily, meetingState]);
```

### Meeting-State Handling

```ts
const meetingState = useMeetingState();
// 'new' → initial, auto-join triggered
// 'joining-meeting' → Spinner anzeigen
// 'joined-meeting' → Video-Tiles rendern
// 'left-meeting' → onLeave callback
// 'error' → Fehlermeldung
```

### Kamera/Mikrofon Toggle

```ts
daily.setLocalAudio(!isAudioEnabled);
daily.setLocalVideo(!isVideoEnabled);
```

### Geräte-Auswahl

```ts
const { cameras, microphones, speakers, setCamera, setMicrophone, setSpeaker } = useDevices();
// setCamera(deviceId), setMicrophone(deviceId), setSpeaker(deviceId)
```

### Fullscreen

```ts
containerRef.current.requestFullscreen();
document.exitFullscreen();
```

### Phase-basierter Rahmen

```tsx
<div className={`... ${
  currentPhase === DyadRole.SPEAKER ? 'shadow-[inset_0_0_0_4px_rgba(249,115,22,0.5)]' :
  currentPhase === DyadRole.LISTENER ? 'shadow-[inset_0_0_0_4px_rgba(59,130,246,0.5)]' :
  ''
}`}>
```

Orange = Sprechen, Blau = Zuhören.

## Troubleshooting

### Kamera leuchtet kurz auf, dann Reset
Race Condition in `startVideoSession()`. Lösung: `startSession()` gibt Session direkt zurück statt `loadSessions()` aufzurufen.

### 401 bei createRoom
Token abgelaufen. `useVideoCall` macht automatischen Retry mit `refreshSession()`.

### Audio funktioniert nicht
`<DailyAudio />` fehlt innerhalb von `<DailyProvider>`. Muss genau einmal gerendert werden.

### Video schwarz
- Browser-Berechtigung prüfen (`checkMediaPermissions()`)
- `start_video_off` in Room-Config prüfen (sollte `false` sein)
- `DailyVideo` braucht korrekte `sessionId` (von `useParticipantIds`)

### Meeting-State bleibt "new"
`daily.join()` wurde nicht aufgerufen oder ist fehlgeschlagen. Prüfe ob `useEffect` mit Auto-Join korrekt feuert.

### Teilnehmer sieht sich nicht
`useParticipantIds({ filter: 'remote' })` filtert den lokalen User raus. Für alle: ohne Filter oder `localSessionId` manuell hinzufügen.
