import type { ServerEvent } from '@yt-dlp-studio/shared'

type Listener = (event: ServerEvent) => void

/** In-process pub/sub used to push realtime updates to connected clients */
export class EventBus {
  private listeners = new Set<Listener>()

  emit(event: ServerEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event)
      }
      catch {}
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  get size() {
    return this.listeners.size
  }
}
