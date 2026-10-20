import type { LibraryEntry } from '@yt-dlp-studio/shared'
import clsx from 'clsx'
import { File, FileAudio, FileImage, FileText, FileVideo, Folder } from 'lucide-react'
import { useState } from 'react'
import { libraryUrl } from '../../lib/api'

const ICONS = { directory: Folder, video: FileVideo, audio: FileAudio, image: FileImage, subtitle: FileText, other: File }
const COLORS = { directory: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10', video: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10', audio: 'text-pink-500 bg-pink-50 dark:bg-pink-500/10', image: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10', subtitle: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10', other: 'text-slate-400 bg-slate-100 dark:bg-white/5' }

/** Images show themselves; media prefer the local same-named cover, then the remote thumbnail of their task */
function coverUrl(entry: LibraryEntry) {
  if (entry.type === 'image')
    return libraryUrl(entry.path)
  return entry.thumbnailPath ? libraryUrl(entry.thumbnailPath) : entry.thumbnailUrl
}

interface Props {
  entry: LibraryEntry
  className?: string
  iconSize: number
  /** Mark media covers with their type, so a video thumbnail is not mistaken for an image file */
  badge?: boolean
}

/** Thumbnail of a library entry, falling back to the type icon when there is none or it fails to load */
export function EntryCover({ entry, className, iconSize, badge }: Props) {
  const src = coverUrl(entry)
  const [failed, setFailed] = useState<string>()
  const Icon = ICONS[entry.type]

  if (src && failed !== src) {
    return (
      <div className={clsx('relative overflow-hidden bg-slate-100 dark:bg-white/5', className)}>
        {/* Remote thumbnails often reject hotlinking with a foreign referrer */}
        <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setFailed(src)} />
        {badge && entry.type !== 'image' && (
          <span className="absolute bottom-1.5 left-1.5 flex size-5 items-center justify-center rounded bg-black/60 text-white backdrop-blur-sm"><Icon size={12} /></span>
        )}
      </div>
    )
  }
  return (
    <div className={clsx('flex items-center justify-center', COLORS[entry.type], className)}>
      <Icon size={iconSize} strokeWidth={iconSize > 20 ? 1.4 : 2} />
    </div>
  )
}
