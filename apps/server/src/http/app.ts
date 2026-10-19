import type { AppServices } from '../services'
import { Hono } from 'hono'
import { createApi } from './api'
import { createStaticHandler } from './static'

export function createApp(services: AppServices) {
  const app = new Hono()
  const base = services.config.basePath === '/' ? '' : services.config.basePath.slice(0, -1)

  app.get('/healthz', c => c.json({ ok: true }))
  app.route(`${base}/api`, createApi(services))

  if (base) {
    app.get(base, c => c.redirect(`${base}/`, 308))
    app.all(`${base}/*`, createStaticHandler(services.config))
  }
  else {
    app.all('*', createStaticHandler(services.config))
  }

  return app
}
