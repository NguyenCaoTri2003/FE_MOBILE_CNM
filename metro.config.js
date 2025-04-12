const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Thêm cấu hình cho resolver
config.resolver.assetExts.push(
  // Thêm các extension file tĩnh
  'db',
  'mp3',
  'ttf',
  'obj',
  'png',
  'jpg'
);

module.exports = config; 