import type { ServerConfig } from '../config'
import { Buffer } from 'node:buffer'
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import path from 'node:path'
import { JsonStore } from './store'

interface AuthData {
  secret: string
  passwordHash?: string
}

function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 32).toString('hex')
  return `${salt}:${hash}`
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

export const AUTH_COOKIE = 'ytds_token'

/**
 * Optional single password protection. The password can be fixed by the
 * environment (`AUTH_PASSWORD`) or set from the UI.
 */
export class AuthService {
  private store: JsonStore<AuthData>
  private envFingerprint?: string

  constructor(private readonly config: ServerConfig) {
    this.store = new JsonStore(path.join(config.dataDir, 'auth.json'), { secret: '' })
  }

  async init() {
    await this.store.load()
    if (!this.store.data.secret) {
      this.store.data.secret = randomBytes(32).toString('hex')
      await this.store.flush()
    }
  }

  get enabled() {
    return Boolean(this.config.password || this.store.data.passwordHash)
  }

  /** Password is controlled by environment and can not be changed from the UI */
  get locked() {
    return Boolean(this.config.password)
  }

  verifyPassword(password: string) {
    if (this.config.password)
      return safeEqual(password, this.config.password)
    const stored = this.store.data.passwordHash
    if (!stored)
      return true
    const [salt] = stored.split(':')
    return safeEqual(hashPassword(password, salt), stored)
  }

  async setPassword(password: string) {
    this.store.data.passwordHash = password ? hashPassword(password) : undefined
    await this.store.flush()
  }

  /** Token changes whenever the password changes, which logs out all sessions */
  createToken() {
    if (this.config.password)
      this.envFingerprint ??= hashPassword(this.config.password, 'env')
    const fingerprint = this.envFingerprint ?? this.store.data.passwordHash ?? ''
    return createHmac('sha256', this.store.data.secret).update(`v1:${fingerprint}`).digest('base64url')
  }

  verifyToken(token: string | undefined) {
    if (!this.enabled)
      return true
    if (!token)
      return false
    return safeEqual(token, this.createToken())
  }
}
