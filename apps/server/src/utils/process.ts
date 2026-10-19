import type { ChildProcess } from 'node:child_process'
import { execFile, spawn } from 'node:child_process'
import process from 'node:process'

export const isWindows = process.platform === 'win32'

/** Kill a process and all of its children (yt-dlp spawns ffmpeg) */
export function killProcessTree(child: ChildProcess, signal: NodeJS.Signals = 'SIGTERM') {
  if (child.pid == null || child.exitCode != null)
    return
  if (isWindows) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
    return
  }
  try {
    // Children are spawned detached, so the pid is also the process group id
    process.kill(-child.pid, signal)
  }
  catch {
    child.kill(signal)
  }
}

export interface ExecResult {
  code: number | null
  stdout: string
  stderr: string
}

export function execCapture(
  command: string,
  args: string[],
  options: { timeout?: number, env?: NodeJS.ProcessEnv, maxBuffer?: number, cwd?: string, signal?: AbortSignal } = {},
) {
  return new Promise<ExecResult>((resolve, reject) => {
    execFile(command, args, {
      timeout: options.timeout,
      env: options.env,
      cwd: options.cwd,
      signal: options.signal,
      maxBuffer: options.maxBuffer ?? 64 * 1024 * 1024,
      windowsHide: true,
      encoding: 'utf8',
    }, (error, stdout, stderr) => {
      if (error && (error as NodeJS.ErrnoException).code === 'ENOENT')
        return reject(error)
      if (options.signal?.aborted)
        return reject(new Error('Canceled'))
      if (error && 'killed' in error && error.killed && options.timeout)
        stderr = `${stderr}\nTimed out after ${Math.round(options.timeout / 1000)}s`
      resolve({
        code: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
        stdout,
        stderr,
      })
    })
  })
}

/**
 * Split a command line string into args, supporting single / double quotes.
 */
export function splitArgs(input: string) {
  const args: string[] = []
  let current = ''
  let quote: string | null = null
  let hasToken = false
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quote) {
      if (ch === quote)
        quote = null
      else if (ch === '\\' && quote === '"' && i + 1 < input.length)
        current += input[++i]
      else
        current += ch
    }
    else if (ch === '"' || ch === '\'') {
      quote = ch
      hasToken = true
    }
    else if (/\s/.test(ch)) {
      if (hasToken || current) {
        args.push(current)
        current = ''
        hasToken = false
      }
    }
    else {
      current += ch
    }
  }
  if (hasToken || current)
    args.push(current)
  return args
}
