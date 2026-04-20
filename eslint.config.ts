import antfu from '@antfu/eslint-config'

export default antfu({
  test: true,
  ignores: [
    'references/**',
  ],
})
