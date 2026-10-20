import type { ServerType } from '@hono/node-server'
import process from 'node:process'
import { serve } from '@hono/node-server'
import { APP_VERSION, loadConfig } from './config'
import { createApp } from './http/app'
import { AppServices } from './services'
import { createLogger, setLogLevel } from './utils/logger'

async function main() {
  const config = loadConfig()
  setLogLevel(config.logLevel)
  const logger = createLogger('system')
  logger.info(`Starting yt-dlp Studio v${APP_VERSION}`, {
    data: { node: process.version, platform: `${process.platform}-${process.arch}`, dataDir: config.dataDir, container: config.container, pid: process.pid },
  })

  const services = new AppServices(config)
  await services.init()
  logger.info('Services ready', {
    data: { tasks: services.queue.list().length, subscriptions: services.subscriptions.list().length, downloadDir: services.settings.value.downloadDir, auth: services.auth.enabled },
  })
  const app = createApp(services)
  const servers: ServerType[] = []

  function listen(hostname: string) {
    return new Promise<ServerType>((resolve, reject) => {
      const server = serve({ fetch: app.fetch, port: config.port, hostname }, (info) => {
        logger.info(`Listening on http://${info.family === 'IPv6' ? `[${info.address}]` : info.address}:${info.port}${config.basePath}`)
        resolve(server)
      })
      server.once('error', reject)
    })
  }

  try {
    for (const host of config.hosts)
      servers.push(await listen(host))
  }
  catch (error) {
    logger.error('Could not start server', { error })
    await services.shutdown()
    process.exit(1)
  }

  let stopping = false
  async function shutdown(signal: string) {
    if (stopping)
      return
    stopping = true
    logger.info(`Received ${signal}, shutting down...`, { data: { uptime: Math.round(process.uptime()) } })
    for (const server of servers)
      server.close()
    await services.shutdown()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error })
  })
  process.on('unhandledRejection', (error) => {
    logger.error('Unhandled rejection', { error })
  })
}

void main().catch((error) => {
  createLogger('system').error('Failed to initialize server', { error })
  process.exitCode = 1
})
