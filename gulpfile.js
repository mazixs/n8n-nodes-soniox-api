/**
 * gulpfile.js для n8n-nodes-soniox-api
 * Копирует иконки и другие assets в dist директорию
 */

const { src, dest } = require('gulp');

/**
 * Копирует иконки (.png, .svg) в dist с сохранением структуры
 */
function buildIcons() {
  return src(['nodes/**/*.{png,svg}', 'credentials/**/*.{png,svg}'], { base: '.' })
    .pipe(dest('dist/'));
}

exports['build:icons'] = buildIcons;
exports.default = buildIcons;
