import type { Context } from 'hono'
import type { ServerConfig } from '../config'
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import path from 'node:path'

interface EmbeddedAsset {
  type: string
  data: string
}

declare const __EMBEDDED_WEB__: Record<string, EmbeddedAsset> | undefined

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

function headers(c: Context, file: string) {
  c.header('Content-Type', TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream')
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Referrer-Policy', 'same-origin')
  c.header('X-Frame-Options', 'DENY')
  c.header('Content-Security-Policy', 'default-src \'self\'; img-src \'self\' data: https:; media-src \'self\' blob:; connect-src \'self\'; style-src \'self\' \'unsafe-inline\'; script-src \'self\'')
  c.header('Cache-Control', file === 'index.html' ? 'no-cache' : 'public, max-age=31536000, immutable')
}

function defaultWebDir() {
  // Works from repository root and from apps/server.
  const candidates = [
    path.resolve('apps/web/dist'),
    path.resolve('../web/dist'),
    path.resolve('web'),
  ]
  return candidates
}

export function createStaticHandler(config: ServerConfig) {
  const embedded = typeof __EMBEDDED_WEB__ === 'undefined' ? {} : __EMBEDDED_WEB__
  const candidates = config.webDir ? [config.webDir] : defaultWebDir()

  return async (c: Context) => {
    let requestPath
    try {
      const base = config.basePath === '/' ? '/' : config.basePath
      const fullPath = c.req.path
      const relativePath = base === '/' ? fullPath : fullPath.slice(base.length)
      requestPath = decodeURIComponent(relativePath).replace(/^\/+/, '')
    }
    catch {
      return c.text('Bad Request', 400)
    }
    if (!requestPath || requestPath.endsWith('/'))
      requestPath += 'index.html'
    if (requestPath.includes('..'))
      return c.text('Forbidden', 403)

    const embeddedAsset = embedded[requestPath] ?? (requestPath.includes('.') ? undefined : embedded['index.html'])
    if (embeddedAsset) {
      const file = embedded[requestPath] ? requestPath : 'index.html'
      headers(c, file)
      c.header('Content-Type', embeddedAsset.type)
      return c.body(Buffer.from(embeddedAsset.data, 'base64'))
    }

    for (const root of candidates) {
      const requested = path.join(root, requestPath)
      try {
        const stat = await fs.stat(requested)
        if (stat.isFile()) {
          headers(c, requestPath)
          return c.body(await fs.readFile(requested))
        }
      }
      catch {}
    }

    // SPA fallback
    if (!requestPath.includes('.')) {
      for (const root of candidates) {
        try {
          const file = path.join(root, 'index.html')
          const content = await fs.readFile(file)
          headers(c, 'index.html')
          return c.body(content)
        }
        catch {}
      }
    }
    return c.text('yt-dlp Studio web assets not found. Run `pnpm build` first.', 404)
  }
}
