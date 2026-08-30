// @ts-nocheck
import React, { useCallback } from 'react'
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import SliderNative from '@react-native-community/slider'
const Slider = SliderNative as unknown as React.ComponentType<{
  style?: object; minimumValue?: number; maximumValue?: number; value?: number
  onSlidingComplete?: (v: number) => void; minimumTrackTintColor?: string
  maximumTrackTintColor?: string; thumbTintColor?: string
}>
import TrackPlayer, { usePlaybackState, useProgress, State } from 'react-native-track-player'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
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
  const translateY = useSharedValue(0)

  const pan = Gesture.Pan()
    .activeOffsetY([15, 15])
    .onUpdate(e => {
      if (e.translationY > 0) translateY.value = e.translationY
    })
    .onEnd(e => {
      if (e.translationY > SCREEN_H * 0.25) {
        translateY.value = withSpring(SCREEN_H, {}, () => runOnJS(onClose)())
      } else {
        translateY.value = withSpring(0)
      }
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const panStyle: any = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const doShare = useCallback(async () => {
    await Share.open({
      title: track.title,
      url: api.streamUrl(track.filename),
      type: 'audio/*',
    }).catch(() => {})
  }, [track])

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.root, panStyle, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration || 1}
            value={position}
            onSlidingComplete={(v: number) => TrackPlayer.seekTo(v)}
            minimumTrackTintColor={colors.purple}
            maximumTrackTintColor={colors.cardBorder}
            thumbTintColor={colors.purple}
          />
          <View style={styles.timeRow}>
            <Text style={styles.time}>{fmt(position)}</Text>
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
    </GestureDetector>
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
  slider: { width: '100%', height: 40 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
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
