/** A snippet that can be inserted into an expression input (output template, format selector…) */
export interface TokenItem {
  token: string
  label: string
  description?: string
}

export interface TokenGroup {
  title: string
  items: TokenItem[]
}

/** A complete value that replaces the input content */
export interface TokenPreset {
  label: string
  value: string
  description?: string
  /** Monospace line shown under the label, defaults to `value` */
  detail?: string
}
