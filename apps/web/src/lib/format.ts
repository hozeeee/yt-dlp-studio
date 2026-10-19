export function formatBytes(value?: number | null, digits = 1) {
  if (value == null || !Number.isFinite(value))
    return '—'
  if (value < 1024)
    return `${value} B`
  const units = ['KiB', 'MiB', 'GiB', 'TiB']
  let size = value
  let unit = -1
  do {
    size /= 1024
    unit++
  } while (size >= 1024 && unit < units.length - 1)
  return `${size.toFixed(size >= 100 ? 0 : digits)} ${units[unit]}`
}

export function formatSpeed(value?: number | null) {
  return value ? `${formatBytes(value)}/s` : '—'
}

export function formatDuration(seconds?: number | null) {
  if (seconds == null || !Number.isFinite(seconds))
    return '—'
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

export function formatDate(value?: number | string) {
  if (!value)
    return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function formatEta(seconds?: number | null) {
  if (seconds == null)
    return '—'
  if (seconds < 60)
    return `${Math.ceil(seconds)}s`
  if (seconds < 3600)
    return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`
  return `${Math.floor(seconds / 3600)}h ${Math.ceil((seconds % 3600) / 60)}m`
}

export function truncateMiddle(value: string, length = 42) {
  return value.length <= length ? value : `${value.slice(0, length / 2)}…${value.slice(-length / 2)}`
}
