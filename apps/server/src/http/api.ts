import type { Context, MiddlewareHandler } from 'hono'
import type { AppServices } from '../services'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { streamSSE } from 'hono/streaming'
import { ZodError } from 'zod'
import {
  addDownloadsSchema,
  binaryParamSchema,
  createSubscriptionSchema,
  idsSchema,
  infoRequestSchema,
  loginSchema,
  passwordSchema,
  taskActionSchema,
  updateCookieSchema,
  updateSubscriptionSchema,
  uploadCookieSchema,
} from '../schemas'
import { AUTH_COOKIE } from '../services/auth'
import { validateExternalUrl } from '../utils/url'

function jsonError(c: Context, message: string, status = 400, details?: unknown) {
  return c.json({ error: message, details }, status as 400)
}

function decodePath(input: string) {
  try {
    return decodeURIComponent(input)
  }
  catch {
    throw new Error('Invalid encoded path')
  }
}

async function bodyJson(c: Context) {
  try {
    return await c.req.json()
  }
  catch {
    throw new Error('Invalid JSON body')
  }
}

const loginAttempts = new Map<string, { count: number, reset: number }>()

export function createApi(services: AppServices) {
  const api = new Hono()

  api.onError((error, c) => {
    if (error instanceof ZodError)
      return jsonError(c, 'Invalid request', 400, error.issues)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return jsonError(c, message, message.includes('not found') ? 404 : 400)
  })

  api.get('/auth/status', c => c.json({ enabled: services.auth.enabled, authenticated: services.auth.verifyToken(getCookie(c, AUTH_COOKIE)) }))
  api.post('/auth/login', async (c) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() || c.req.header('x-real-ip') || 'local'
    const now = Date.now()
    const attempt = loginAttempts.get(ip)
    if (attempt && attempt.reset > now && attempt.count >= 10)
      return jsonError(c, 'Too many login attempts, try again later', 429)
    const { password } = loginSchema.parse(await bodyJson(c))
    if (!services.auth.verifyPassword(password)) {
      loginAttempts.set(ip, { count: attempt?.reset && attempt.reset > now ? attempt.count + 1 : 1, reset: now + 15 * 60_000 })
      return jsonError(c, 'Invalid password', 401)
    }
    loginAttempts.delete(ip)
    setCookie(c, AUTH_COOKIE, services.auth.createToken(), {
      httpOnly: true,
      sameSite: 'Strict',
      secure: new URL(c.req.url).protocol === 'https:',
      path: services.config.basePath,
      maxAge: 365 * 24 * 60 * 60,
    })
    return c.json({ ok: true })
  })
  api.post('/auth/logout', (c) => {
    deleteCookie(c, AUTH_COOKIE, { path: services.config.basePath })
    return c.json({ ok: true })
  })

  const requireAuth: MiddlewareHandler = async (c, next) => {
    if (!services.auth.verifyToken(getCookie(c, AUTH_COOKIE)))
      return jsonError(c, 'Authentication required', 401)
    await next()
  }
  api.use('*', requireAuth)

  api.get('/events', (c) => {
    return streamSSE(c, async (stream) => {
      await stream.writeSSE({ event: 'message', data: JSON.stringify({
        type: 'snapshot',
        tasks: services.queue.list(),
        subscriptions: services.subscriptions.list(),
      }) })
      const unsubscribe = services.events.subscribe(event => void stream.writeSSE({ event: 'message', data: JSON.stringify(event) }))
      const ping = setInterval(() => void stream.writeSSE({ event: 'ping', data: String(Date.now()) }), 20_000)
      try {
        while (!stream.aborted)
          await stream.sleep(5_000)
      }
      finally {
        clearInterval(ping)
        unsubscribe()
      }
    })
  })

  api.post('/info', async (c) => {
    const request = infoRequestSchema.parse(await bodyJson(c))
    const url = await validateExternalUrl(request.url)
    // Kill yt-dlp when the browser stops waiting (canceled preview / left the page)
    return c.json(await services.info.get(url, { flat: request.flat ?? true, cookies: request.cookies, signal: c.req.raw.signal }))
  })

  api.get('/tasks', c => c.json(services.queue.list()))
  api.post('/tasks', async (c) => {
    const request = addDownloadsSchema.parse(await bodyJson(c))
    const entries = request.entries ?? []
    for (const entry of entries)
      entry.url = await validateExternalUrl(entry.url)
    let result = { tasks: services.queue.addEntries(entries, request.options), errors: [] as { url: string, error: string }[] }
    if (request.urls?.length) {
      const urls = await Promise.all(request.urls.map(validateExternalUrl))
      const fromUrls = await services.queue.addUrls(urls, request.options, request.noPlaylist)
      result = { tasks: [...result.tasks, ...fromUrls.tasks], errors: fromUrls.errors }
    }
    return c.json(result, result.errors.length && !result.tasks.length ? 400 : 201)
  })
  api.post('/tasks/action', async (c) => {
    const request = taskActionSchema.parse(await bodyJson(c))
    services.queue.action(request.ids, request.action)
    return c.json({ ok: true })
  })
  api.post('/tasks/remove', async (c) => {
    const request = idsSchema.parse(await bodyJson(c))
    await services.queue.remove(request.ids, request.deleteFiles ?? false)
    return c.json({ ok: true })
  })
  api.post('/tasks/clear', async (c) => {
    const body = idsSchema.partial().parse(await bodyJson(c))
    return c.json({ removed: await services.queue.clearFinished(body.deleteFiles ?? false) })
  })

  api.get('/subscriptions', c => c.json(services.subscriptions.list()))
  api.post('/subscriptions', async (c) => {
    const request = createSubscriptionSchema.parse(await bodyJson(c))
    request.url = await validateExternalUrl(request.url)
    return c.json(await services.subscriptions.create(request), 201)
  })
  api.patch('/subscriptions/:id', async (c) => {
    const result = await services.subscriptions.update(c.req.param('id'), updateSubscriptionSchema.parse(await bodyJson(c)))
    return result ? c.json(result) : jsonError(c, 'Subscription not found', 404)
  })
  api.delete('/subscriptions/:id', async (c) => {
    const ok = await services.subscriptions.remove(c.req.param('id'))
    return ok ? c.json({ ok }) : jsonError(c, 'Subscription not found', 404)
  })
  api.post('/subscriptions/:id/check', async c => c.json(await services.subscriptions.check(c.req.param('id'))))

  api.get('/library', async c => c.json(await services.library.list(c.req.query('path') || '')))
  api.post('/library/mkdir', async (c) => {
    const { path: dir } = await bodyJson(c) as { path?: string }
    await services.library.mkdir(dir || '')
    return c.json({ ok: true })
  })
  api.post('/library/rename', async (c) => {
    const { path: file, name } = await bodyJson(c) as { path?: string, name?: string }
    if (!file || !name)
      return jsonError(c, 'Path and name are required')
    return c.json({ path: await services.library.rename(file, name) })
  })
  api.post('/library/remove', async (c) => {
    const { path: file } = await bodyJson(c) as { path?: string }
    if (!file)
      return jsonError(c, 'Path is required')
    await services.library.remove(file)
    return c.json({ ok: true })
  })

  api.get('/library/content/*', async (c) => {
    const relative = decodePath(c.req.param('*') ?? '')
    const file = services.library.resolve(relative)
    if (!file)
      return jsonError(c, 'Invalid path')
    let stat
    try {
      stat = await fs.stat(file)
    }
    catch {
      return jsonError(c, 'File not found', 404)
    }
    if (!stat.isFile())
      return jsonError(c, 'Not a file', 400)

    const range = c.req.header('range')
    const disposition = c.req.query('download') === '1' ? 'attachment' : 'inline'
    const headers: Record<string, string> = {
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(path.basename(file))}`,
      'Cache-Control': 'private, max-age=3600',
    }
    let start = 0
    let end = stat.size - 1
    let status = 200
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range)
      if (match) {
        start = match[1] ? Number(match[1]) : Math.max(0, stat.size - Number(match[2]))
        end = match[2] && match[1] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1
        if (start > end || start >= stat.size)
          return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } })
        status = 206
        headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`
      }
    }
    headers['Content-Length'] = String(end - start + 1)
    const body = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream
    return new Response(body, { status, headers })
  })

  api.get('/settings', c => c.json(services.settings.toPublic()))
  api.put('/settings', async c => c.json(await services.settings.update(await bodyJson(c))))
  api.get('/system', async c => c.json(await services.system.info()))
  api.post('/system/binaries/:name/:action', (c) => {
    const { name, action } = binaryParamSchema.parse(c.req.param())
    return c.json(services.binaries.start(name, action), 202)
  })
  api.delete('/system/binaries/:name/job', (c) => {
    const { name } = binaryParamSchema.pick({ name: true }).parse(c.req.param())
    return c.json({ ok: services.binaries.cancel(name) })
  })

  api.get('/cookies', c => c.json(services.cookies.list()))
  api.post('/cookies', async (c) => {
    const { name, content } = uploadCookieSchema.parse(await bodyJson(c))
    return c.json(await services.cookies.add(name, content), 201)
  })
  api.patch('/cookies/:id', async (c) => {
    const { enabled } = updateCookieSchema.parse(await bodyJson(c))
    const file = await services.cookies.setEnabled(c.req.param('id'), enabled)
    return file ? c.json(file) : jsonError(c, 'Cookie file not found', 404)
  })
  api.delete('/cookies/:id', async (c) => {
    const ok = await services.cookies.remove(c.req.param('id'))
    return ok ? c.json({ ok }) : jsonError(c, 'Cookie file not found', 404)
  })
  api.put('/system/password', async (c) => {
    if (services.auth.locked)
      return jsonError(c, 'Password is controlled by AUTH_PASSWORD', 403)
    const { current, password } = passwordSchema.parse(await bodyJson(c))
    if (services.auth.enabled && !services.auth.verifyPassword(current ?? ''))
      return jsonError(c, 'Current password is incorrect', 403)
    await services.auth.setPassword(password)
    services.settings.broadcast()
    if (password)
      setCookie(c, AUTH_COOKIE, services.auth.createToken(), { httpOnly: true, sameSite: 'Strict', path: services.config.basePath, maxAge: 365 * 24 * 60 * 60 })
    else
      deleteCookie(c, AUTH_COOKIE, { path: services.config.basePath })
    return c.json({ ok: true, enabled: services.auth.enabled })
  })

  return api
}
