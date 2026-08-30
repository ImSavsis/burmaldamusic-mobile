// @ts-nocheck
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../theme'

const LOGO = [
  ' в–€в–€в–€в–€в–€в–€в•— в–€в–€в–€в•—   в–€в–€в–€в•—',
  ' в–€в–€в•”в•ђв•ђв–€в–€в•—в–€в–€в–€в–€в•— в–€в–€в–€в–€в•‘',
  ' в–€в–€в–€в–€в–€в–€в•”в•ќв–€в–€в•”в–€в–€в–€в–€в•”в–€в–€в•‘',
  ' в–€в–€в•”в•ђв•ђв–€в–€в•—в–€в–€в•‘в•љв–€в–€в•”в•ќв–€в–€в•‘',
  ' в–€в–€в–€в–€в–€в–€в•”в•ќв–€в–€в•‘ в•љв•ђв•ќ в–€в–€в•‘',
  ' в•љв•ђв•ђв•ђв•ђв•ђв•ќ в•љв•ђв•ќ     в•љв•ђв•ќ',
]

type Props = { small?: boolean }

export function Logo({ small }: Props) {
  const scale = small ? 0.55 : 1
  return (
    <View style={styles.wrap}>
      {LOGO.map((line, i) => (
        <Text key={i} style={[styles.line, { fontSize: 10 * scale, lineHeight: 13 * scale }]}>
          {line}
        </Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start' },
  line: {
    fontFamily: 'Courier New',
    color: colors.purple,
    fontWeight: 'bold',
    letterSpacing: 0,
  },
})
