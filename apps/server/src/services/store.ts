import { readJson, writeFileAtomic } from '../utils/fs'
import { createLogger } from '../utils/logger'

const logger = createLogger('system')

/**
 * A tiny JSON file backed store. Writes are debounced and atomic,
 * so it is safe to call `save()` frequently.
 */
export class JsonStore<T> {
  private timer: NodeJS.Timeout | null = null
  private pending: Promise<void> = Promise.resolve()
  data: T

  constructor(readonly file: string, initial: T, private readonly delay = 500) {
    this.data = initial
  }

  async load(normalize?: (raw: T) => T) {
    try {
      const raw = await readJson<T>(this.file)
      if (raw !== undefined)
        this.data = normalize ? normalize(raw) : raw
    }
    catch (error) {
      logger.error(`Failed to read ${this.file}, using defaults`, { error })
    }
    return this.data
  }

  save() {
    if (this.timer)
      return
    this.timer = setTimeout(() => {
      this.timer = null
      void this.flush()
    }, this.delay)
  }

  async flush() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    const content = JSON.stringify(this.data, null, 2)
    this.pending = this.pending
      .then(() => writeFileAtomic(this.file, content))
      .catch(error => logger.error(`Failed to write ${this.file}`, { error }))
    await this.pending
  }
}
