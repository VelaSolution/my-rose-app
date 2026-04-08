import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.velasolution.vela',
  appName: 'VELA',
  webDir: 'out',
  server: {
    url: 'https://velaanalytics.com?app=1',
    cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'VELA',
    scrollEnabled: true,
    allowsLinkPreview: false,
  },
};

export default config;
