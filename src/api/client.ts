const BASE = 'https://burmalda.nodeshift.space'

export type Track = {
  id: string
  filename: string
  title: string
  artist: string
  duration: number
  size: number
  coverUrl: string
  streamUrl: string
  addedAt: number
}

export type DownloadJob = {
  id: string
  progress: number
  speed: string
  eta: string
  status: 'pending' | 'downloading' | 'converting' | 'done' | 'error'
  error?: string
  track?: Track
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`)
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json()
}

async function post<T>(path: string, body: object): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json()
}

export const api = {
  tracks: () => get<Track[]>('/api/tracks'),
  download: (url: string, format: string) => post<{ id: string }>('/api/download', { url, format }),
  search: (q: string) => get<Array<{ id: string; title: string; channel: string; duration: string; thumbnail: string }>>(`/api/search?q=${encodeURIComponent(q)}`),
  progress: (id: string) => get<DownloadJob>(`/api/download/${id}`),
  deleteTrack: (filename: string) => post('/api/delete', { filename }),
  streamUrl: (filename: string) => `${BASE}/api/stream/${encodeURIComponent(filename)}`,
  coverUrl: (filename: string) => `${BASE}/api/cover/${encodeURIComponent(filename)}`,
  latestRelease: () => fetch('https://api.github.com/repos/ImSavsis/burmaldamusic-mobile/releases/latest').then(r => r.json()),
}
