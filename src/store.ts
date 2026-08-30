import AsyncStorage from '@react-native-async-storage/async-storage'
import { Track } from './api/client'

const KEYS = {
  LIBRARY: 'bm_library',
  LAST_TRACK: 'bm_last_track',
  SETTINGS: 'bm_settings',
}

export const store = {
  async getLibrary(): Promise<Track[]> {
    const raw = await AsyncStorage.getItem(KEYS.LIBRARY)
    return raw ? JSON.parse(raw) : []
  },

  async setLibrary(tracks: Track[]) {
    await AsyncStorage.setItem(KEYS.LIBRARY, JSON.stringify(tracks))
  },

  async addTrack(track: Track) {
    const lib = await store.getLibrary()
    const filtered = lib.filter(t => t.id !== track.id)
    await store.setLibrary([track, ...filtered])
  },

  async removeTrack(id: string) {
    const lib = await store.getLibrary()
    await store.setLibrary(lib.filter(t => t.id !== id))
  },

  async getLastTrack(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.LAST_TRACK)
  },

  async setLastTrack(id: string) {
    await AsyncStorage.setItem(KEYS.LAST_TRACK, id)
  },

  async getSettings(): Promise<{ format: string }> {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS)
    return raw ? JSON.parse(raw) : { format: 'FLAC' }
  },

  async setSettings(settings: { format: string }) {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings))
  },
}
