import React, { useState, useRef, useCallback } from 'react'
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  Pressable, ActivityIndicator, Image, Alert, Linking,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Logo } from '../components/Logo'
import { api } from '../api/client'
import { store } from '../store'
import { colors, radius, spacing } from '../theme'

const FORMATS = ['FLAC', 'WAV', 'MP3', 'OPUS', 'MP4']

type SearchResult = { id: string; title: string; channel: string; duration: string; thumbnail: string }
type Phase = 'idle' | 'searching' | 'results' | 'downloading'

export function SearchScreen() {
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')
  const [fmt, setFmt] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [results, setResults] = useState<SearchResult[]>([])
  const [dlProgress, setDlProgress] = useState(0)
  const [dlMsg, setDlMsg] = useState('')
  const [dlSpeed, setDlSpeed] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPoll = () => { if (pollRef.current) clearInterval(pollRef.current) }

  const search = useCallback(async () => {
    const q = query.trim()
    if (!q) return
    if (/^https?:\/\//.test(q)) {
      startDownload(q)
      return
    }
    setPhase('searching')
    try {
      const res = await api.search(q)
      setResults(res)
      setPhase('results')
    } catch {
      Alert.alert('ошибка', 'не удалось найти')
      setPhase('idle')
    }
  }, [query, fmt])

  const startDownload = useCallback(async (url: string) => {
    setPhase('downloading')
    setDlProgress(0)
    setDlMsg('начинаем...')
    try {
      const { id } = await api.download(url, FORMATS[fmt])
      pollRef.current = setInterval(async () => {
        try {
          const job = await api.progress(id)
          setDlProgress(job.progress)
          setDlSpeed(job.speed || '')
          if (job.status === 'downloading') setDlMsg(`скачиваем...`)
          if (job.status === 'converting') setDlMsg('конвертируем...')
          if (job.status === 'done') {
            stopPoll()
            if (job.track) await store.addTrack(job.track)
            setPhase('idle')
            setQuery('')
            Alert.alert('✓ готово', job.track?.title || 'скачано')
          }
          if (job.status === 'error') {
            stopPoll()
            setPhase('idle')
            Alert.alert('ошибка', job.error || 'неизвестная ошибка')
          }
        } catch { stopPoll(); setPhase('idle') }
      }, 1000)
    } catch (e: any) {
      setPhase('idle')
      Alert.alert('ошибка', e.message)
    }
  }, [fmt])

  const cancel = () => {
    stopPoll()
    setPhase(results.length ? 'results' : 'idle')
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Logo />
          <Text style={styles.sub}>youtube · spotify · soundcloud · apple</Text>
        </View>

        {phase !== 'downloading' && (
          <>
            <View style={styles.inputWrap}>
              <Text style={styles.inputPre}>▸</Text>
              <TextInput
                style={styles.input}
                placeholder="url или название трека"
                placeholderTextColor={colors.dim}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={search}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor={colors.purple}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => { setQuery(''); setPhase('idle') }}>
                  <Text style={styles.clear}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.formatRow}>
              <TouchableOpacity onPress={() => setFmt(f => (f - 1 + FORMATS.length) % FORMATS.length)}>
                <Text style={styles.arrow}>←</Text>
              </TouchableOpacity>
              {FORMATS.map((f, i) => (
                <TouchableOpacity key={f} onPress={() => setFmt(i)}>
                  <Text style={[styles.fmt, i === fmt && styles.fmtActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setFmt(f => (f + 1) % FORMATS.length)}>
                <Text style={styles.arrow}>→</Text>
              </TouchableOpacity>
            </View>

            {phase === 'idle' && (
              <TouchableOpacity style={styles.btn} onPress={search}>
                <Text style={styles.btnText}>скачать</Text>
              </TouchableOpacity>
            )}

            {phase === 'searching' && (
              <View style={styles.center}>
                <ActivityIndicator color={colors.purple} size="large" />
                <Text style={styles.searchMsg}>ищем...</Text>
              </View>
            )}

            {phase === 'results' && (
              <View style={styles.results}>
                <Text style={styles.resultsHint}>выбери трек</Text>
                {results.map((r, i) => (
                  <TouchableOpacity key={r.id} style={styles.result} onPress={() => startDownload(`https://www.youtube.com/watch?v=${r.id}`)}>
                    {r.thumbnail ? (
                      <Image source={{ uri: r.thumbnail }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbFb]}>
                        <Text style={styles.thumbIcon}>♪</Text>
                      </View>
                    )}
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle} numberOfLines={2}>{r.title}</Text>
                      <Text style={styles.resultMeta}>{r.channel}  {r.duration}</Text>
                    </View>
                    <Text style={styles.resultNum}>{i + 1}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => setPhase('idle')}>
                  <Text style={styles.back}>← назад</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {phase === 'downloading' && (
          <View style={styles.dlWrap}>
            <Text style={styles.dlTitle}>скачиваем...</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${dlProgress}%` as any }]} />
            </View>
            <View style={styles.dlRow}>
              <Text style={styles.dlPct}>{dlProgress.toFixed(1)}%</Text>
              <Text style={styles.dlSpeed}>{dlSpeed}</Text>
            </View>
            <Text style={styles.dlMsg}>{dlMsg}</Text>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancel}>
              <Text style={styles.cancelText}>отмена</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  header: { marginBottom: spacing.lg, marginTop: spacing.md },
  sub: { color: colors.subtext, fontSize: 12, fontFamily: 'Courier New', marginTop: spacing.xs },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.purple + '66',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  inputPre: { color: colors.magenta, fontSize: 16, marginRight: spacing.sm, fontFamily: 'Courier New' },
  input: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 14 },
  clear: { color: colors.subtext, fontSize: 16, padding: spacing.xs },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  arrow: { color: colors.subtext, fontSize: 18, paddingHorizontal: spacing.xs },
  fmt: { color: colors.subtext, fontSize: 13, paddingHorizontal: spacing.sm, fontFamily: 'Courier New' },
  fmtActive: {
    color: colors.purple,
    fontWeight: 'bold',
    backgroundColor: colors.purple + '1a',
    borderRadius: radius.sm,
    paddingVertical: 2,
  },
  btn: {
    backgroundColor: colors.purple,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  center: { alignItems: 'center', paddingVertical: spacing.xl },
  searchMsg: { color: colors.subtext, marginTop: spacing.md, fontFamily: 'Courier New' },
  results: { marginTop: spacing.sm },
  resultsHint: { color: colors.subtext, fontSize: 12, marginBottom: spacing.sm, fontFamily: 'Courier New' },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  thumb: { width: 52, height: 52, borderRadius: 6 },
  thumbFb: { backgroundColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
  thumbIcon: { fontSize: 20, color: colors.purple },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 13, color: colors.text, fontWeight: '500' },
  resultMeta: { fontSize: 11, color: colors.subtext, marginTop: 3 },
  resultNum: { fontSize: 18, color: colors.dim, fontWeight: 'bold', marginRight: spacing.xs },
  back: { color: colors.subtext, textAlign: 'center', marginTop: spacing.md, fontFamily: 'Courier New' },
  dlWrap: { marginTop: spacing.xl },
  dlTitle: { color: colors.purple, fontWeight: '700', fontSize: 16, marginBottom: spacing.lg },
  progressTrack: {
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: { height: 4, backgroundColor: colors.purple, borderRadius: 2 },
  dlRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  dlPct: { color: colors.text, fontWeight: '700', fontFamily: 'Courier New' },
  dlSpeed: { color: colors.subtext, fontFamily: 'Courier New', fontSize: 12 },
  dlMsg: { color: colors.subtext, fontSize: 12, fontFamily: 'Courier New', marginBottom: spacing.xl },
  cancelBtn: { alignSelf: 'center', padding: spacing.md },
  cancelText: { color: colors.error, fontFamily: 'Courier New' },
})
