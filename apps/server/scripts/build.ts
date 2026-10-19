import type { BuildOptions } from 'esbuild'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { build } from 'esbuild'

const root = path.resolve(import.meta.dirname, '../../..')
const serverDir = path.join(root, 'apps/server')
const webDir = path.join(root, 'apps/web/dist')
const single = process.argv.includes('--single')
const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')) as { version: string }

interface Asset { type: string, data: string }
const MIME: Record<string, string> = {
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
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.zip': 'application/zip',
  '.xpi': 'application/x-xpinstall',
}

async function collectAssets(dir: string, relative = '', assets: Record<string, Asset> = {}) {
  for (const item of await fs.readdir(path.join(dir, relative), { withFileTypes: true })) {
    const name = path.posix.join(relative, item.name)
    if (item.isDirectory()) {
      await collectAssets(dir, name, assets)
    }
    else if (!name.endsWith('.map')) {
      const content = await fs.readFile(path.join(dir, name))
      assets[name] = {
        type: MIME[path.extname(name).toLowerCase()] ?? 'application/octet-stream',
        data: content.toString('base64'),
      }
    }
  }
  return assets
}

let assets: Record<string, Asset> = {}
if (single) {
  try {
    assets = await collectAssets(webDir)
  }
  catch {
    throw new Error(`Web build not found at ${webDir}. Run the web build first.`)
  }
  if (!assets['index.html'])
    throw new Error('Web build does not contain index.html')
}

const outfile = single
  ? path.join(root, 'dist/yt-dlp-studio.mjs')
  : path.join(serverDir, 'dist/index.mjs')

const options: BuildOptions = {
  entryPoints: [path.join(serverDir, 'src/index.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'bundle',
  sourcemap: single ? false : 'linked',
  minify: false,
  treeShaking: true,
  legalComments: 'none',
  banner: { js: '#!/usr/bin/env node' },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __EMBEDDED_WEB__: JSON.stringify(assets),
  },
  logLevel: 'info',
}

await fs.mkdir(path.dirname(outfile), { recursive: true })
await build(options)
await fs.chmod(outfile, 0o755)
console.log(single
  ? `\nSingle-file build created: ${path.relative(root, outfile)} (${Object.keys(assets).length} embedded assets)`
  : `\nServer build created: ${path.relative(root, outfile)}`)
