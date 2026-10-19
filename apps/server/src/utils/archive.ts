import fs from 'node:fs/promises'
import path from 'node:path'
import { ensureDir } from './fs'
import { execCapture } from './process'

/**
 * Extract a .zip / .tar.* archive using the system `tar`.
 * GNU tar (Linux) needs `xz` for .tar.xz; bsdtar (Windows 10+, macOS) also handles zip.
 */
export async function extractArchive(archive: string, dest: string) {
  await ensureDir(dest)
  let result
  try {
    // -o: don't restore the archive's uid/gid (GNU tar does so by default when running as root)
    result = await execCapture('tar', ['-x', '-o', '-f', archive, '-C', dest], { timeout: 10 * 60_000 })
  }
  catch {
    throw new Error('Could not run `tar`, please install it or install the binary manually')
  }
  if (result.code === 0)
    return

  if (archive.endsWith('.zip')) {
    const unzip = await execCapture('unzip', ['-o', '-q', archive, '-d', dest], { timeout: 10 * 60_000 }).catch(() => null)
    if (unzip?.code === 0)
      return
  }
  const detail = result.stderr.trim().split('\n').slice(-3).join('\n')
  const hint = /xz/i.test(detail) ? ' (install the `xz` / `xz-utils` package)' : ''
  throw new Error(`Failed to extract ${path.basename(archive)}${hint}: ${detail}`)
}

/** Recursively find files whose basename is in `names` */
export async function findFiles(root: string, names: string[]) {
  const found = new Map<string, string>()
  async function walk(dir: string) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory())
        await walk(full)
      else if (names.includes(entry.name) && !found.has(entry.name))
        found.set(entry.name, full)
    }
  }
  await walk(root)
  return found
}
