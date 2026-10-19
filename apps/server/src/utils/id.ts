import { randomBytes } from 'node:crypto'

export function createId(size = 10) {
  return randomBytes(size).toString('base64url').slice(0, size)
}
