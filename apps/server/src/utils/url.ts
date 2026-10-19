import dns from 'node:dns/promises'
import net from 'node:net'

function isPrivateIp(ip: string) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return a === 0
      || a === 10
      || a === 127
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || a >= 224
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase().split('%')[0]
    return lower === '::'
      || lower === '::1'
      || lower.startsWith('fc')
      || lower.startsWith('fd')
      || /^fe[89ab]/.test(lower)
      || lower.startsWith('ff')
      || lower.startsWith('::ffff:127.')
      || lower.startsWith('::ffff:10.')
      || lower.startsWith('::ffff:192.168.')
  }
  return true
}

/** Basic SSRF protection for URLs submitted to yt-dlp */
export async function validateExternalUrl(input: string) {
  let url: URL
  try {
    url = new URL(input)
  }
  catch {
    throw new Error('Invalid URL')
  }
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('Only HTTP and HTTPS URLs are allowed')
  if (!url.hostname)
    throw new Error('URL has no hostname')
  if (net.isIP(url.hostname)) {
    if (isPrivateIp(url.hostname))
      throw new Error('Private and local addresses are not allowed')
  }
  else {
    let addresses
    try {
      addresses = await dns.lookup(url.hostname, { all: true, verbatim: true })
    }
    catch {
      throw new Error('Could not resolve URL hostname')
    }
    if (!addresses.length || addresses.some(item => isPrivateIp(item.address)))
      throw new Error('Private and local addresses are not allowed')
  }
  return url.toString()
}
