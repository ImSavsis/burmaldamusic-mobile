import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, StyleSheet, RefreshControl, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TrackPlayer, { Track as RNTrack } from 'react-native-track-player'
import { Track, api } from '../api/client'
import { store } from '../store'
import { TrackCard } from '../components/TrackCard'
import { colors, spacing } from '../theme'

type Props = { currentTrackId: string | null; onPlay: (track: Track) => void }

export function LibraryScreen({ currentTrackId, onPlay }: Props) {
  const insets = useSafeAreaInsets()
  const [tracks, setTracks] = useState<Track[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const remote = await api.tracks()
      setTracks(remote)
      await store.setLibrary(remote)
    } catch {
      const local = await store.getLibrary()
      setTracks(local)
    }
  }, [])

  useEffect(() => { load() }, [])

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const play = async (track: Track) => {
    await store.setLastTrack(track.id)
    const rnTrack: RNTrack = {
      id: track.id,
      url: api.streamUrl(track.filename),
      title: track.title,
      artist: track.artist,
      artwork: track.coverUrl,
      duration: track.duration,
    }
    await TrackPlayer.reset()
    const queue = tracks.map(t => ({
      id: t.id,
      url: api.streamUrl(t.filename),
      title: t.title,
      artist: t.artist,
      artwork: t.coverUrl,
      duration: t.duration,
    }))
    const idx = tracks.findIndex(t => t.id === track.id)
    await TrackPlayer.add(queue)
    await TrackPlayer.skip(idx)
    await TrackPlayer.play()
    onPlay(track)
  }

  const remove = async (id: string) => {
    Alert.alert('удалить?', 'трек будет удалён с сервера', [
      { text: 'отмена', style: 'cancel' },
      {
        text: 'удалить', style: 'destructive', onPress: async () => {
          const t = tracks.find(tr => tr.id === id)
          if (!t) return
          try { await api.deleteTrack(t.filename) } catch {}
          const next = tracks.filter(tr => tr.id !== id)
          setTracks(next)
          await store.removeTrack(id)
        },
      },
    ])
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Text style={styles.title}>библиотека</Text>
      {tracks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>♫</Text>
          <Text style={styles.emptyText}>пусто — скачай что-нибудь</Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={t => t.id}
          renderItem={({ item }) => (
            <TrackCard
              track={item}
              isPlaying={item.id === currentTrackId}
              onPress={() => play(item)}
              onDelete={remove}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.purple}
            />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  list: { paddingBottom: spacing.xl * 3 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyIcon: { fontSize: 56, color: colors.dim },
  emptyText: { color: colors.subtext, fontFamily: 'Courier New', fontSize: 13 },
})
