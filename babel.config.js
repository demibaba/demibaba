// babel.config.js - Reanimated 완전 제거 버전
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // plugins 완전 제거 - reanimated 안 쓰기
  };
};