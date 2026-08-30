import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../theme'

const LOGO = [
  ' ██████╗ ███╗   ███╗',
  ' ██╔══██╗████╗ ████║',
  ' ██████╔╝██╔████╔██║',
  ' ██╔══██╗██║╚██╔╝██║',
  ' ██████╔╝██║ ╚═╝ ██║',
  ' ╚═════╝ ╚═╝     ╚═╝',
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
