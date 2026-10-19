import type { BinaryJob, BinaryJobAction, BinaryJobPhase, BinaryName } from '@yt-dlp-studio/shared'
import { useAppStore } from '../stores/app'
import { toast } from '../stores/toast'
import { api } from './api'

export const BINARY_LABELS: Record<BinaryName, string> = {
  ytdlp: 'yt-dlp',
  ffmpeg: 'ffmpeg',
}

export const PHASE_LABELS: Record<BinaryJobPhase, string> = {
  preparing: '准备中',
  downloading: '下载中',
  extracting: '解压中',
  verifying: '校验中',
  updating: '更新中',
  done: '已完成',
}

export function actionLabel(action: BinaryJobAction) {
  return action === 'install' ? '安装' : '更新'
}

/** Starts a background install / update. Progress then arrives through `binary:job` events */
export async function startBinaryJob(name: BinaryName, action: BinaryJobAction) {
  try {
    const job = await api<BinaryJob>(`/system/binaries/${name}/${action}`, { method: 'POST' })
    useAppStore.getState().applyBinaryJob(job)
  }
  catch (error) {
    toast.error(`无法开始${actionLabel(action)} ${BINARY_LABELS[name]}`, error instanceof Error ? error.message : String(error))
  }
}

export async function cancelBinaryJob(name: BinaryName) {
  try {
    await api(`/system/binaries/${name}/job`, { method: 'DELETE' })
  }
  catch (error) {
    toast.error('取消失败', error instanceof Error ? error.message : String(error))
  }
}

/** True once a working yt-dlp binary has been found */
export function useYtdlpReady() {
  return useAppStore(state => Boolean(state.system?.ytdlp))
}

/** 0-100 when the total size is known */
export function jobPercent(job: BinaryJob) {
  if (job.phase === 'done')
    return 100
  if (job.phase !== 'downloading' || !job.total)
    return null
  return job.downloaded / job.total * 100
}
