import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'app',
  react: true,
  typescript: true,
  rules: {
    'no-console': 'off',
  },
  ignores: [
    '**/dist/**',
    'data/**',
    'downloads/**',
  ],
})
