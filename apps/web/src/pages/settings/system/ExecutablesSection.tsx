import type { AppSettings } from '@yt-dlp-studio/shared'
import { Field } from '../../../components/Field'
import { Section } from '../../../components/Section'

export function ExecutablesSection({ value, onChange, locked }: { value: AppSettings, onChange: (value: AppSettings) => void, locked: string[] }) {
  const set = <K extends keyof AppSettings>(key: K, next: AppSettings[K]) => onChange({ ...value, [key]: next })
  return (
    <Section title="可执行文件" description="留空时优先使用上方安装的托管版本，其次查找 PATH；也可以指定自定义位置。">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="yt-dlp 路径"><input className="input-base" value={value.ytdlpPath} disabled={locked.includes('ytdlpPath')} onChange={event => set('ytdlpPath', event.target.value)} placeholder="自动（托管版本 → PATH）" /></Field>
        <Field label="ffmpeg 路径"><input className="input-base" value={value.ffmpegPath} disabled={locked.includes('ffmpegPath')} onChange={event => set('ffmpegPath', event.target.value)} placeholder="自动（托管版本 → PATH）" /></Field>
        <Field label="GitHub 下载镜像前缀" hint="例如 https://ghfast.top/，用于安装 yt-dlp 与 ffmpeg；修改后需保存才会生效">
          <input className="input-base" value={value.githubMirror} onChange={event => set('githubMirror', event.target.value)} placeholder="留空直连 GitHub" />
        </Field>
      </div>
    </Section>
  )
}
