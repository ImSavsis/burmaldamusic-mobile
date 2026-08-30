// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { View, Text, Image, StyleSheet, TouchableOpacity, Pressable } from 'react-native'
import TrackPlayer, {
  usePlaybackState, useProgress, State, Event, useTrackPlayerEvents,
} from 'react-native-track-player'
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated'
import { colors, radius, spacing } from '../theme'
import { Track } from '../api/client'

type Props = {
  track: Track | null
  onExpand: () => void
}

export function MiniPlayer({ track, onExpand }: Props) {
  const playbackState = usePlaybackState()
  const { position, duration } = useProgress(250)
  const isPlaying = playbackState.state === State.Playing
  const spin = useSharedValue(0)

  useEffect(() => {
    if (isPlaying) {
      spin.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.linear }), -1)
    } else {
      spin.value = withTiming(spin.value, { duration: 200 })
    }
  }, [isPlaying])

  const discStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }))

  if (!track) return null

  const progress = duration > 0 ? position / duration : 0

  return (
    <Pressable style={styles.root} onPress={onExpand}>
      <View style={[styles.bar, { width: `${progress * 100}%` as any }]} />
      <View style={styles.content}>
        <Animated.View style={discStyle}>
          {track.coverUrl ? (
            <Image source={{ uri: track.coverUrl }} style={styles.art} />
          ) : (
            <View style={[styles.art, styles.artFallback]}>
              <Text style={styles.artIcon}>в™Є</Text>
            </View>
          )}
        </Animated.View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{track.artist}</Text>
        </View>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => isPlaying ? TrackPlayer.pause() : TrackPlayer.play()}>
          <Text style={styles.btnIcon}>{isPlaying ? 'вЏё' : 'в–¶'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => TrackPlayer.skip(0)}>
          <Text style={styles.btnIcon}>вЏ­</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    overflow: 'hidden',
  },
  bar: { height: 2, backgroundColor: colors.purple },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm + 4,
  },
  art: { width: 40, height: 40, borderRadius: 20 },
  artFallback: { backgroundColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
  artIcon: { fontSize: 18, color: colors.purple },
  info: { flex: 1 },
  title: { fontSize: 13, fontWeight: '600', color: colors.text },
  artist: { fontSize: 11, color: colors.subtext, marginTop: 1 },
  btn: { padding: spacing.xs + 2 },
  btnIcon: { fontSize: 20, color: colors.purple },
})
