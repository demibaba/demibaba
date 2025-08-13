// metro.config.js - SDK 53 호환 완전 수정 버전
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 🚀 SDK 53 Metro 버그 해결: package.json exports 비활성화
config.resolver.unstable_enablePackageExports = false;

// 🚀 store.clear 문제 직접 해결: cacheStores 제거
// config.cacheStores = []; // 이 줄 제거

// SDK 53 성능 최적화
config.resolver.sourceExts.push('cjs', 'mjs');

// 경로 별칭 설정 (SDK 53 최적화)
config.resolver.alias = {
  '@': require('path').resolve(__dirname),
  '@/components': require('path').resolve(__dirname, 'components'),
  '@/config': require('path').resolve(__dirname, 'config'),
  '@/utils': require('path').resolve(__dirname, 'utils'),
  '@/assets': require('path').resolve(__dirname, 'assets'),
};

// SDK 53 성능 최적화
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

module.exports = config;
