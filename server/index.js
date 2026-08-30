const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const { execFile, spawn } = require('child_process')
const crypto = require('crypto')

const app = express()
app.use(cors())
app.use(express.json())

const MUSIC_DIR = process.env.MUSIC_DIR || '/opt/burmalda/music'
const PORT = process.env.PORT || 3100
const jobs = new Map()

function scanDir() {
  if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR, { recursive: true })
  return fs.readdirSync(MUSIC_DIR).filter(f => /\.(mp3|flac|wav|opus|m4a|mp4)$/.test(f))
}

function parseMeta(filename) {
  const base = path.parse(filename).name
  const parts = base.split(' - ')
  return {
    id: crypto.createHash('md5').update(filename).digest('hex'),
    filename,
    title: parts.length >= 2 ? parts.slice(1).join(' - ') : base,
    artist: parts.length >= 2 ? parts[0] : 'Unknown',
    duration: null,
    size: fs.statSync(path.join(MUSIC_DIR, filename)).size,
    addedAt: fs.statSync(path.join(MUSIC_DIR, filename)).mtimeMs,
  }
}

app.get('/api/tracks', (req, res) => {
  const tracks = scanDir().map(f => ({
    ...parseMeta(f),
    coverUrl: `/api/cover/${encodeURIComponent(f)}`,
    streamUrl: `/api/stream/${encodeURIComponent(f)}`,
  }))
  tracks.sort((a, b) => b.addedAt - a.addedAt)
  res.json(tracks)
})

app.get('/api/stream/:filename', (req, res) => {
  const fp = path.join(MUSIC_DIR, decodeURIComponent(req.params.filename))
  if (!fp.startsWith(MUSIC_DIR) || !fs.existsSync(fp)) return res.sendStatus(404)
  const stat = fs.statSync(fp)
  const range = req.headers.range
  if (range) {
    const [s, e] = range.replace(/bytes=/, '').split('-')
    const start = parseInt(s, 10)
    const end = e ? parseInt(e, 10) : stat.size - 1
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'audio/mpeg',
    })
    fs.createReadStream(fp, { start, end }).pipe(res)
  } else {
    res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': 'audio/mpeg' })
    fs.createReadStream(fp).pipe(res)
  }
})

app.get('/api/cover/:filename', (req, res) => {
  const coverDir = path.join(MUSIC_DIR, '.covers')
  if (!fs.existsSync(coverDir)) fs.mkdirSync(coverDir)
  const base = path.parse(decodeURIComponent(req.params.filename)).name
  const coverPath = path.join(coverDir, base + '.jpg')
  if (fs.existsSync(coverPath)) return res.sendFile(coverPath)
  res.sendStatus(404)
})

app.get('/api/search', (req, res) => {
  const q = req.query.q || ''
  const proc = spawn('yt-dlp', [
    `ytsearch5:${q}`, '--flat-playlist', '-J', '--no-playlist', '--no-colors', '-q',
  ])
  let out = ''
  proc.stdout.on('data', d => { out += d })
  proc.on('close', code => {
    if (code !== 0) return res.json([])
    try {
      const data = JSON.parse(out)
      const entries = data.entries || []
      res.json(entries.map(e => ({
        url: `https://www.youtube.com/watch?v=${e.id}`,
        title: e.title,
        duration: e.duration,
        channel: e.channel || e.uploader || '',
        thumbnail: e.thumbnails?.[0]?.url || null,
      })))
    } catch {
      res.json([])
    }
  })
})

app.post('/api/download', (req, res) => {
  const { url, format } = req.body
  if (!url) return res.status(400).json({ error: 'no url' })
  const id = crypto.randomUUID()
  const job = { id, progress: 0, speed: '', eta: '', status: 'downloading', error: null, track: null }
  jobs.set(id, job)
  res.json({ id })

  const fmtMap = { FLAC: 'bestaudio[ext=flac]/bestaudio', WAV: 'bestaudio[ext=wav]/bestaudio', MP3: 'bestaudio', OPUS: 'bestaudio[ext=opus]/bestaudio', MP4: 'bestvideo+bestaudio/best' }
  const fmt = fmtMap[format] || 'bestaudio'
  const pcMap = { FLAC: 'flac', WAV: 'wav', MP3: 'mp3', OPUS: 'opus', MP4: null }
  const pc = pcMap[format]

  const args = [
    url,
    '-f', fmt,
    '-o', path.join(MUSIC_DIR, '%(uploader,channel|Unknown)s - %(title)s.%(ext)s'),
    '--embed-metadata', '--embed-thumbnail',
    '--no-playlist', '--no-colors', '--progress',
    '--newline', '-q',
  ]
  if (pc && pc !== 'mp4') args.push('--audio-format', pc, '-x')

  const proc = spawn('yt-dlp', args)

  const handleLine = line => {
    const m = line.match(/\[download\]\s+([\d.]+)%.*?(\d+\.\d+\w+\/s).*?ETA\s+(\S+)/)
    if (m) { job.progress = parseFloat(m[1]); job.speed = m[2]; job.eta = m[3] }
    if (line.includes('[download] 100%')) job.progress = 100
  }

  proc.stdout.on('data', d => d.toString().split('\n').forEach(handleLine))
  proc.stderr.on('data', d => d.toString().split('\n').forEach(handleLine))

  proc.on('close', code => {
    if (code === 0) {
      job.status = 'done'
      job.progress = 100
      const files = scanDir().map(f => ({ f, t: fs.statSync(path.join(MUSIC_DIR, f)).mtimeMs }))
      files.sort((a, b) => b.t - a.t)
      if (files[0]) {
        job.track = {
          ...parseMeta(files[0].f),
          coverUrl: `/api/cover/${encodeURIComponent(files[0].f)}`,
          streamUrl: `/api/stream/${encodeURIComponent(files[0].f)}`,
        }
      }
    } else {
      job.status = 'error'
      job.error = `exit ${code}`
    }
  })
})

app.get('/api/download/:id', (req, res) => {
  const job = jobs.get(req.params.id)
  if (!job) return res.sendStatus(404)
  res.json(job)
})

app.post('/api/delete', (req, res) => {
  const { filename } = req.body
  const fp = path.join(MUSIC_DIR, filename)
  if (!fp.startsWith(MUSIC_DIR) || !fs.existsSync(fp)) return res.sendStatus(404)
  fs.unlinkSync(fp)
  const coverDir = path.join(MUSIC_DIR, '.covers')
  const cover = path.join(coverDir, path.parse(filename).name + '.jpg')
  if (fs.existsSync(cover)) fs.unlinkSync(cover)
  res.json({ ok: true })
})

app.listen(PORT, '0.0.0.0', () => console.log(`burmalda backend :${PORT}`))
