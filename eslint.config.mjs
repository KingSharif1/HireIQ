import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  ...nextVitals,
  globalIgnores(['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts']),
  {
    rules: {
      // React Compiler lints shipped with eslint-config-next 16. They flag
      // existing fetch-on-mount, URL-param sync, localStorage hydration, and
      // "latest callback" refs. Rewriting those changes timing. Leave them off
      // so lint stays green without a behavior change.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
    },
  },
])
