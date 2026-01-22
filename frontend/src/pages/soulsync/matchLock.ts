// src/utils/matchLock.ts
// Cross-tab lock for matching. Prevent same user opening multiple tabs from starting match simultaneously.

export type MatchLockInfo = { owner: string; ts: number }

export interface MatchLockOptions {
  lockKey?: string
  channelName?: string
  tabIdKey?: string
  ttlMs?: number
  heartbeatMs?: number
  onLockLost?: () => void
}

export class MatchLock {
  private lockKey: string
  private channelName: string
  private tabIdKey: string
  private ttlMs: number
  private heartbeatMs: number
  private bc: BroadcastChannel | null = null
  private heartbeatTimer: number | null = null
  private onLockLost?: () => void

  public readonly tabId: string

  constructor(opts: MatchLockOptions = {}) {
    this.lockKey = opts.lockKey ?? 'ss_match_lock_v1'
    this.channelName = opts.channelName ?? 'ss_match_lock_channel'
    this.tabIdKey = opts.tabIdKey ?? 'ss_tab_id_v1'
    this.ttlMs = opts.ttlMs ?? 30_000
    this.heartbeatMs = opts.heartbeatMs ?? 10_000
    this.onLockLost = opts.onLockLost

    // tabId stored in sessionStorage so each tab gets its own id
    const existing = sessionStorage.getItem(this.tabIdKey)
    this.tabId =
      existing ||
      (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`)
    sessionStorage.setItem(this.tabIdKey, this.tabId)

    this.bc = new BroadcastChannel(this.channelName)
  }

  dispose() {
    this.stopHeartbeat()
    this.releaseIfOwned()
    if (this.bc) {
      this.bc.close()
      this.bc = null
    }
  }

  private readLock(): MatchLockInfo | null {
    const raw = sessionStorage.getItem(this.lockKey)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  private writeLock(owner: string) {
    sessionStorage.setItem(this.lockKey, JSON.stringify({ owner, ts: Date.now() }))
  }

  private isActive(lock: MatchLockInfo | null): boolean {
    if (!lock) return false
    return Date.now() - lock.ts < this.ttlMs
  }

  /** Try acquire lock; returns true if you own it now. */
  acquire(): boolean {
    const lock = this.readLock()
    if (lock && this.isActive(lock) && lock.owner !== this.tabId) {
      return false
    }
    this.writeLock(this.tabId)
    return true
  }

  /** Release lock if current tab owns it. */
  releaseIfOwned() {
    const lock = this.readLock()
    if (lock?.owner === this.tabId) {
      sessionStorage.removeItem(this.lockKey)
      this.bc?.postMessage({ type: 'lock_released', owner: this.tabId })
    }
  }

  /** Start heartbeat to keep lock alive. Call after acquire() success. */
  startHeartbeat() {
    this.stopHeartbeat()
    // write immediately
    this.writeLock(this.tabId)

    this.heartbeatTimer = window.setInterval(() => {
      const lock = this.readLock()

      // If someone else owns a still-active lock, we lost it.
      if (lock && this.isActive(lock) && lock.owner !== this.tabId) {
        this.stopHeartbeat()
        this.onLockLost?.()
        return
      }

      // renew
      this.writeLock(this.tabId)
    }, this.heartbeatMs)
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
}
