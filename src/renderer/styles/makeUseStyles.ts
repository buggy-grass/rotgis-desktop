import type React from 'react'

export type StyleObject = React.CSSProperties

export function makeUseStyles<
  T extends Record<string, StyleObject>
>(styles: T) {
  return () => styles
}
