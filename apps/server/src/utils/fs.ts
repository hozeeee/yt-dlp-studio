import { randomBytes } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

export async function pathExists(file: string) {
  try {
    await fs.access(file)
    return true
  }
  catch {
    return false
  }
}

/** Write a file atomically by writing to a temp file and renaming it */
export async function writeFileAtomic(file: string, data: string | Uint8Array) {
  await ensureDir(path.dirname(file))
  const tmp = `${file}.${randomBytes(4).toString('hex')}.tmp`
  await fs.writeFile(tmp, data)
  await fs.rename(tmp, file)
}

export async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return undefined
    throw error
  }
}

/** Convert a native path to a posix style relative path */
export function toPosix(p: string) {
  return p.split(path.sep).join('/')
}

/**
 * Resolve `relative` inside `root` and make sure the result does not escape it.
 * Returns `null` for invalid paths.
 */
export function resolveInside(root: string, relative = '') {
  const cleaned = relative.replace(/\\/g, '/').replace(/^\/+/, '')
  const target = path.resolve(root, cleaned)
  const rel = path.relative(root, target)
  if (rel.startsWith('..') || path.isAbsolute(rel))
    return null
  return target
}

export async function getFileSize(file: string) {
  try {
    return (await fs.stat(file)).size
  }
  catch {
    return 0
  }
}
