<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-23 | Updated: 2026-03-23 -->

# sound

## Purpose
Audio assets for meditation bells and singing bowls used during dyad sessions. These files are played at phase transitions (speaker/listener switch) and session start/end.

## Key Files

| File | Description |
|------|-------------|
| `116315__garuda1982__big-singing-bowl.wav` | Large singing bowl sound |
| `389522__cabled_mess__singing-bowl_23042017-03-raw.wav` | Raw singing bowl recording |
| `42095__fauxpress__bell-meditation.mp3` | Meditation bell (MP3 format) |
| `94024__lozkaye__burmabell.aiff` | Burmese bell sound |

## For AI Agents

### Working In This Directory
- Audio files are sourced from Freesound.org (numbers in filenames are Freesound IDs)
- Do not delete or rename existing files without checking references in `types.ts` (GongSoundOption) and timer hooks
- Prefer web-friendly formats (MP3, WAV) for new additions

## Dependencies

### Internal
- Referenced by `dyadenpraxis-online/types.ts` — `GongSoundOption` interface
- Played by `dyadenpraxis-online/hooks/useDyadTimerEngine.ts` and `useGongTimer.ts`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
