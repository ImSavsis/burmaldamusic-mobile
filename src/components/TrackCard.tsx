import React, { useCallback, useRef } from 'react'
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Pressable,
  Animated, PanResponder,
} from 'react-native'
import Share from 'react-native-share'
import { Track, api } from '../api/client'
import { colors, radius, spacing } from '../theme'

type Props = {
  track: Track
  isPlaying: boolean
  onPress: () => void
  onDelete: (id: string) => void
}

export function TrackCard({ track, isPlaying, onPress, onDelete }: Props) {
  const offsetX = useRef(new Animated.Value(0)).current

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) offsetX.setValue(Math.max(-130, gs.dx))
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -80) {
          Animated.spring(offsetX, { toValue: -130, useNativeDriver: true }).start()
        } else {
          Animated.spring(offsetX, { toValue: 0, useNativeDriver: true }).start()
        }
      },
    }),
  ).current

  const doShare = useCallback(async () => {
    await Share.open({
      title: track.title,
      url: api.streamUrl(track.filename),
      type: 'audio/flac',
    }).catch(() => {})
    Animated.spring(offsetX, { toValue: 0, useNativeDriver: true }).start()
  }, [track, offsetX])

  const doDelete = useCallback(() => {
    Animated.timing(offsetX, { toValue: -400, duration: 250, useNativeDriver: true }).start(() => {
      onDelete(track.id)
    })
  }, [track.id, onDelete, offsetX])

  const mins = Math.floor(track.duration / 60)
  const secs = String(Math.floor(track.duration % 60)).padStart(2, '0')

  return (
    <View style={styles.root}>
      <View style={styles.actions}>
        <Pressable style={[styles.action, styles.share]} onPress={doShare}>
          <Text style={styles.actionIcon}>↑</Text>
          <Text style={styles.actionLabel}>поделиться</Text>
        </Pressable>
        <Pressable style={[styles.action, styles.delete]} onPress={doDelete}>
          <Text style={styles.actionIcon}>✕</Text>
          <Text style={styles.actionLabel}>удалить</Text>
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.card,
          isPlaying && styles.cardActive,
          { transform: [{ translateX: offsetX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity style={styles.inner} onPress={onPress} activeOpacity={0.7}>
          {track.coverUrl ? (
            <Image source={{ uri: track.coverUrl }} style={styles.cover} />
          ) : (
            <View style={styles.coverFallback}>
              <Text style={styles.coverIcon}>♪</Text>
            </View>
          )}
          <View style={styles.info}>
            <Text style={[styles.title, isPlaying && styles.titleActive]} numberOfLines={1}>
              {track.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>{track.artist}</Text>
          </View>
          <Text style={styles.duration}>{mins}:{secs}</Text>
          {isPlaying && <View style={styles.nowDot} />}
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { marginHorizontal: spacing.md, marginBottom: spacing.sm, overflow: 'visible' },
  actions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  action: {
    width: 65,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  share: { backgroundColor: '#1e3a5f' },
  delete: { backgroundColor: '#3f0e0e' },
  actionIcon: { fontSize: 18, color: colors.text },
  actionLabel: { fontSize: 10, color: colors.subtext },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardActive: { borderColor: colors.purple + '55' },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm + 4,
    gap: spacing.sm + 4,
  },
  cover: { width: 48, height: 48, borderRadius: 8 },
  coverFallback: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverIcon: { fontSize: 22, color: colors.purple },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: colors.text },
  titleActive: { color: colors.purple },
  artist: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  duration: { fontSize: 12, color: colors.dim },
  nowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.purple,
    marginLeft: 4,
  },
})
