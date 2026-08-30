import React, { useState, useEffect } from 'react'
import { View, StyleSheet, Alert, Linking } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import TrackPlayer, { Capability } from 'react-native-track-player'
import { SearchScreen } from './src/screens/SearchScreen'
import { LibraryScreen } from './src/screens/LibraryScreen'
import { PlayerScreen } from './src/screens/PlayerScreen'
import { MiniPlayer } from './src/components/MiniPlayer'
import { Track, api } from './src/api/client'
import { colors } from './src/theme'

const VERSION = '0.1.0'

const Tab = createBottomTabNavigator()

async function setupPlayer() {
  try {
    await TrackPlayer.setupPlayer({ autoHandleInterruptions: true })
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play, Capability.Pause, Capability.Stop,
        Capability.SkipToNext, Capability.SkipToPrevious, Capability.SeekTo,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
    })
  } catch {}
}

async function checkUpdate() {
  try {
    const rel = await api.latestRelease()
    const latest = rel.tag_name?.replace(/^v/, '') || ''
    if (latest && latest !== VERSION) {
      Alert.alert(
        `обновление ${latest}`,
        rel.body?.slice(0, 200) || 'доступна новая версия',
        [
          { text: 'позже' },
          { text: 'скачать', onPress: () => Linking.openURL(rel.assets?.[0]?.browser_download_url || rel.html_url) },
        ],
      )
    }
  } catch {}
}

export default function App() {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [playerOpen, setPlayerOpen] = useState(false)

  useEffect(() => {
    setupPlayer()
    checkUpdate()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <View style={styles.root}>
            <Tab.Navigator
              screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: colors.purple,
                tabBarInactiveTintColor: colors.subtext,
                tabBarLabel: route.name === 'Search' ? 'поиск' : 'библиотека',
              })}>
              <Tab.Screen name="Search" component={SearchScreen} />
              <Tab.Screen name="Library">
                {() => (
                  <LibraryScreen
                    currentTrackId={currentTrack?.id || null}
                    onPlay={t => { setCurrentTrack(t); setPlayerOpen(true) }}
                  />
                )}
              </Tab.Screen>
            </Tab.Navigator>

            {currentTrack && (
              <MiniPlayer
                track={currentTrack}
                onExpand={() => setPlayerOpen(true)}
              />
            )}
          </View>

          {playerOpen && currentTrack && (
            <PlayerScreen
              track={currentTrack}
              onClose={() => setPlayerOpen(false)}
            />
          )}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: '#1e1e1e',
    borderTopWidth: 1,
    elevation: 0,
  },
})
