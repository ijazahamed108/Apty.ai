import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Mini Apty',
  version: '1.0.0',
  description: 'Digital Adoption Platform — author and preview walkthroughs on any site',
  permissions: ['storage', 'activeTab', 'scripting', 'tabs'],
  host_permissions: ['<all_urls>'],
  action: {
    default_title: 'Mini Apty',
    default_popup: 'src/popup/index.html',
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/main.tsx'],
      run_at: 'document_idle',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['assets/*'],
      matches: ['<all_urls>'],
    },
  ],
});
