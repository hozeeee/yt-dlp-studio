import process from 'node:process'

/** A file that must be downloaded to install a binary */
export interface ReleaseFile {
  url: string
  name: string
  /** Hosted on GitHub, so the configured mirror prefix applies */
  github: boolean
  /** Needs extraction (otherwise it's the executable itself) */
  archive: boolean
}

const YTDLP_RELEASE = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/'
const FFMPEG_RELEASE = 'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/'
const FFMPEG_MACOS = 'https://ffmpeg.martin-riedl.de/redirect/latest/macos/'

function isMusl() {
  if (process.platform !== 'linux')
    return false
  const report = process.report?.getReport() as { header?: { glibcVersionRuntime?: string } } | undefined
  return !report?.header?.glibcVersionRuntime
}

/** Standalone yt-dlp executable for the current platform */
export function getYtdlpRelease(): ReleaseFile[] | null {
  const { platform, arch } = process
  let asset: string | null = null
  if (platform === 'win32')
    asset = arch === 'arm64' ? 'yt-dlp_arm64.exe' : arch === 'ia32' ? 'yt-dlp_x86.exe' : 'yt-dlp.exe'
  else if (platform === 'darwin')
    asset = 'yt-dlp_macos'
  else if (platform === 'linux' && arch === 'x64')
    asset = isMusl() ? 'yt-dlp_musllinux' : 'yt-dlp_linux'
  else if (platform === 'linux' && arch === 'arm64')
    asset = isMusl() ? 'yt-dlp_musllinux_aarch64' : 'yt-dlp_linux_aarch64'
  else if (platform === 'linux' && arch === 'arm')
    asset = 'yt-dlp_linux_armv7l'
  return asset ? [{ url: `${YTDLP_RELEASE}${asset}`, name: asset, github: true, archive: false }] : null
}

/** Static ffmpeg + ffprobe builds for the current platform */
export function getFfmpegRelease(): ReleaseFile[] | null {
  const { platform, arch } = process
  const github = (asset: string): ReleaseFile[] => [{ url: `${FFMPEG_RELEASE}${asset}`, name: asset, github: true, archive: true }]
  if (platform === 'linux' && arch === 'x64')
    return github('ffmpeg-master-latest-linux64-gpl.tar.xz')
  if (platform === 'linux' && arch === 'arm64')
    return github('ffmpeg-master-latest-linuxarm64-gpl.tar.xz')
  if (platform === 'win32')
    return github(arch === 'arm64' ? 'ffmpeg-master-latest-winarm64-gpl.zip' : arch === 'ia32' ? 'ffmpeg-master-latest-win32-gpl.zip' : 'ffmpeg-master-latest-win64-gpl.zip')
  if (platform === 'darwin') {
    const base = `${FFMPEG_MACOS}${arch === 'arm64' ? 'arm64' : 'amd64'}/release/`
    return ['ffmpeg.zip', 'ffprobe.zip'].map(name => ({ url: `${base}${name}`, name, github: false, archive: true }))
  }
  return null
}

export function withMirror(file: ReleaseFile, mirror: string) {
  return file.github && mirror ? `${mirror}${file.url}` : file.url
}
