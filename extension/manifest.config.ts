import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'HireIQ — Job Apply Copilot',
  description: 'Save jobs to HireIQ and autofill applications from your profile.',
  version: '0.9.9',
  action: {
    default_popup: 'src/popup.html',
    default_title: 'HireIQ',
  },
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  permissions: ['activeTab', 'storage', 'scripting', 'tabs', 'identity'],
  host_permissions: ['<all_urls>'],
  externally_connectable: {
    matches: [
      'http://localhost:3000/*',
      'https://localhost:3000/*',
      'https://hireiq.kingsharif.com/*',
      'https://*.vercel.app/*',
      'https://*.hireiq.app/*',
      'https://hireiq.app/*',
    ],
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content.ts'],
      run_at: 'document_idle',
    },
  ],
})
