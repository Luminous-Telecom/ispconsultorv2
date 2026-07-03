import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ispconsultor.erp',
  appName: 'ISP Consultor',
  webDir: 'build',
  server: {
    // Usar https://localhost evita problemas de CORS com capacitor://
    iosScheme: 'https',
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
