// @ts-nocheck
import React, { useCallback, useRef, useState } from 'react'
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Dimensions,
  Animated, PanResponder,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TrackPlayer, { usePlaybackState, useProgress, State } from 'react-native-track-player'
import Share from 'react-native-share'
import { Track, api } from '../api/client'
import { colors, radius, spacing } from '../theme'

const { height: SCREEN_H } = Dimensions.get('window')

type Props = { track: Track; onClose: () => void }

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = String(Math.floor(s % 60)).padStart(2, '0')
  return `${m}:${sec}`
}

export function PlayerScreen({ track, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const { state } = usePlaybackState()
  const { position, duration } = useProgress(250)
  const isPlaying = state === State.Playing
  const translateY = useRef(new Animated.Value(0)).current
  const trackWidth = useRef(0)
  const [seekPos, setSeekPos] = useState<number | null>(null)
  const displayPos = seekPos !== null ? seekPos : position
  const progress = duration > 0 ? displayPos / duration : 0

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 15 && gs.dy > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy)
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > SCREEN_H * 0.25) {
          Animated.spring(translateY, { toValue: SCREEN_H, useNativeDriver: true }).start(onClose)
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start()
        }
      },
    }),
  ).current

  const doShare = useCallback(async () => {
    await Share.open({
      title: track.title,
      url: api.streamUrl(track.filename),
      type: 'audio/*',
    }).catch(() => {})
  }, [track])

  return (
    <Animated.View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
        { transform: [{ translateY }] },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.handle} />

      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeIcon}>⌄</Text>
      </TouchableOpacity>

      <View style={styles.artwork}>
        {track.coverUrl ? (
          <Image source={{ uri: track.coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverFb]}>
            <Text style={styles.coverIcon}>♪</Text>
          </View>
        )}
      </View>

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>{track.title}</Text>
        <Text style={styles.artist}>{track.artist}</Text>
      </View>

      <View style={styles.sliderWrap}>
        <View
          style={styles.seekTrack}
          onLayout={e => { trackWidth.current = e.nativeEvent.layout.width }}
          onStartShouldSetResponder={() => true}
          onResponderGrant={e => {
            const x = e.nativeEvent.locationX
            setSeekPos(Math.max(0, Math.min(1, x / (trackWidth.current || 1))) * (duration || 1))
          }}
          onResponderMove={e => {
            const x = e.nativeEvent.locationX
            setSeekPos(Math.max(0, Math.min(1, x / (trackWidth.current || 1))) * (duration || 1))
          }}
          onResponderRelease={e => {
            const x = e.nativeEvent.locationX
            const p = Math.max(0, Math.min(1, x / (trackWidth.current || 1))) * (duration || 1)
            TrackPlayer.seekTo(p)
            setSeekPos(null)
          }}
        >
          <View style={styles.seekBg} />
          <View style={[styles.seekFill, { width: `${progress * 100}%` as any }]} />
          <View style={[styles.seekThumb, { left: `${Math.min(95, progress * 100)}%` as any }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.time}>{fmt(displayPos)}</Text>
          <Text style={styles.time}>{fmt(duration)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrl} onPress={() => TrackPlayer.skipToPrevious()}>
          <Text style={styles.ctrlIcon}>⏮</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.playBtn}
          onPress={() => isPlaying ? TrackPlayer.pause() : TrackPlayer.play()}>
          <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrl} onPress={() => TrackPlayer.skipToNext()}>
          <Text style={styles.ctrlIcon}>⏭</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={doShare}>
          <Text style={styles.actionIcon}>↑</Text>
          <Text style={styles.actionLabel}>поделиться</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg,
    zIndex: 100,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.dim,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  closeBtn: { alignSelf: 'flex-end', padding: spacing.md },
  closeIcon: { fontSize: 28, color: colors.subtext },
  artwork: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  cover: {
    width: Dimensions.get('window').width - spacing.xl * 4,
    height: Dimensions.get('window').width - spacing.xl * 4,
    borderRadius: radius.xl,
  },
  coverFb: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverIcon: { fontSize: 64, color: colors.purple },
  meta: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  artist: { fontSize: 14, color: colors.subtext },
  sliderWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  seekTrack: { height: 28, justifyContent: 'center', position: 'relative' },
  seekBg: {
    position: 'absolute', left: 0, right: 0, height: 3,
    backgroundColor: colors.cardBorder, borderRadius: 2,
  },
  seekFill: {
    position: 'absolute', left: 0, height: 3,
    backgroundColor: colors.purple, borderRadius: 2,
  },
  seekThumb: {
    position: 'absolute', width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.purple, top: 7, marginLeft: -7,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  time: { fontSize: 11, color: colors.subtext, fontFamily: 'Courier New' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  ctrl: { padding: spacing.md },
  ctrlIcon: { fontSize: 28, color: colors.text },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 30, color: colors.white },
  actions: { flexDirection: 'row', justifyContent: 'center' },
  action: { alignItems: 'center', padding: spacing.md, gap: spacing.xs },
  actionIcon: { fontSize: 24, color: colors.subtext },
  actionLabel: { fontSize: 11, color: colors.subtext },
})
