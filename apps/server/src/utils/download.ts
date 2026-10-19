import type { Buffer } from 'node:buffer'
import type { ReadableStream as WebReadableStream } from 'node:stream/web'
import { createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'

export interface DownloadProgress {
  downloaded: number
  total?: number
}

export interface DownloadOptions {
  signal?: AbortSignal
  /** Abort when no data arrives for this long */
  idleTimeout?: number
  onProgress?: (progress: DownloadProgress) => void
}

/** Stream a remote file to disk, reporting progress. Partial files are removed on failure. */
export async function downloadFile(url: string, dest: string, options: DownloadOptions = {}) {
  const idle = new AbortController()
  const signal = options.signal ? AbortSignal.any([options.signal, idle.signal]) : idle.signal
  const idleTimeout = options.idleTimeout ?? 60_000
  let timer: NodeJS.Timeout | undefined
  const arm = () => {
    clearTimeout(timer)
    timer = setTimeout(() => idle.abort(new Error(`No data received for ${idleTimeout / 1000}s`)), idleTimeout)
  }

  try {
    arm()
    const res = await fetch(url, { redirect: 'follow', signal })
    if (!res.ok || !res.body)
      throw new Error(`HTTP ${res.status} ${res.statusText} (${url})`)
    const total = Number(res.headers.get('content-length')) || undefined
    let downloaded = 0
    options.onProgress?.({ downloaded, total })
    const counter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        downloaded += chunk.length
        arm()
        options.onProgress?.({ downloaded, total })
        callback(null, chunk)
      },
    })
    await pipeline(Readable.fromWeb(res.body as WebReadableStream), counter, createWriteStream(dest), { signal })
    if (total && downloaded < total)
      throw new Error(`Incomplete download: ${downloaded} of ${total} bytes`)
    return { downloaded, total }
  }
  catch (error) {
    await fs.rm(dest, { force: true })
    if (signal.aborted && signal.reason instanceof Error)
      throw signal.reason
    throw error
  }
  finally {
    clearTimeout(timer)
  }
}

/** Tracks transfer speed using a short sliding window */
export class SpeedMeter {
  private samples: { time: number, bytes: number }[] = []

  push(bytes: number) {
    const now = Date.now()
    this.samples.push({ time: now, bytes })
    while (this.samples.length > 2 && now - this.samples[0].time > 3_000)
      this.samples.shift()
  }

  get speed() {
    const first = this.samples[0]
    const last = this.samples.at(-1)
    if (!first || !last || last.time === first.time)
      return undefined
    return (last.bytes - first.bytes) / ((last.time - first.time) / 1000)
  }

  reset() {
    this.samples = []
  }
}
