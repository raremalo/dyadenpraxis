import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// @sentry/node mocken — reportError-Logik testen, ohne echtes SDK zu laden.
// withIsolationScope führt den Callback direkt aus (wie das echte SDK).
const { mockInit, mockCapture, mockFlush, mockWithIsolationScope } = vi.hoisted(() => ({
  mockInit: vi.fn(),
  mockCapture: vi.fn(),
  mockFlush: vi.fn().mockResolvedValue(true),
  mockWithIsolationScope: vi.fn((cb: () => unknown) => cb()),
}));

vi.mock('@sentry/node', () => ({
  init: mockInit,
  captureException: mockCapture,
  flush: mockFlush,
  withIsolationScope: mockWithIsolationScope,
}));

import { reportError, sentryEnabled } from '../api/_sentry.js';

describe('api/_sentry', () => {
  const originalDsn = process.env.SENTRY_DSN;

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.SENTRY_DSN
  })

  afterEach(() => {
    if (originalDsn === undefined) delete process.env.SENTRY_DSN
    else process.env.SENTRY_DSN = originalDsn
  })

  it('ist deaktiviert ohne SENTRY_DSN (lokale Tests/Dev unberührt)', async () => {
    expect(sentryEnabled()).toBe(false)

    await reportError(new Error('x'))

    expect(mockInit).not.toHaveBeenCalled()
    expect(mockCapture).not.toHaveBeenCalled()
    expect(mockFlush).not.toHaveBeenCalled()
  })

  it('initialisiert idempotent, captured im Isolation-Scope und flusht mit DSN', async () => {
    process.env.SENTRY_DSN = 'https://test@sentry.example/1'

    await reportError(new Error('boom'))
    // init läuft exakt einmal (Modul-State), capture+flush pro Aufruf.
    // Init-Konfiguration gleich mitverifizieren (nur der ERSTE Aufruf
    // initet): keine Console-Integration (PII in console-Zeilen), keine
    // Breadcrumbs (Isolation-Scope überlebt warme Container).
    const initCallsAfterFirst = mockInit.mock.calls.length
    const initOptions = mockInit.mock.calls[0][0] as {
      maxBreadcrumbs: number
      integrations: (defaults: { name: string }[]) => { name: string }[]
      beforeSend: (event: {
        message?: string
        exception?: { values?: { value?: string }[] }
      }) => unknown
    }
    expect(initOptions.maxBreadcrumbs).toBe(0)
    const fakeDefaults = [{ name: 'Console' }, { name: 'Http' }]
    expect(initOptions.integrations(fakeDefaults)).toEqual([{ name: 'Http' }])
    // Serverseitiges DSGVO-Scrubbing: E-Mails raus aus Message + Exception
    expect(
      initOptions.beforeSend({
        message: 'mail an a@b.de',
        exception: { values: [{ value: 'User x@y.de not found' }] },
      }),
    ).toEqual({
      message: 'mail an [redacted-email]',
      exception: { values: [{ value: 'User [redacted-email] not found' }] },
    })

    await reportError(new Error('boom2'), { handler: 'delete-account' })

    expect(mockInit).toHaveBeenCalledTimes(initCallsAfterFirst)
    expect(mockWithIsolationScope).toHaveBeenCalledTimes(2)
    expect(mockCapture).toHaveBeenCalledTimes(2)
    expect(mockFlush).toHaveBeenCalledTimes(2)
    // Kontext landet als extra
    expect(mockCapture).toHaveBeenLastCalledWith(new Error('boom2'), {
      extra: { handler: 'delete-account' },
    })
  })

  it('übergibt level und wartet bei flushMs: 0 NICHT auf den Flush', async () => {
    process.env.SENTRY_DSN = 'https://test@sentry.example/1'

    await reportError(new Error('non-fatal'), { handler: 'generate-prompt' }, { level: 'warning', flushMs: 0 })

    expect(mockCapture).toHaveBeenCalledWith(new Error('non-fatal'), {
      level: 'warning',
      extra: { handler: 'generate-prompt' },
    })
    expect(mockFlush).not.toHaveBeenCalled()
  })
})
