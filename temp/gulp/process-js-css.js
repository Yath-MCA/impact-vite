// File: utils/process-js-css.js
const gulp = require('gulp');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const cleanCSS = require('gulp-clean-css');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
// Cache-busting with hash
const rev = require('gulp-rev');



/**
 * Process JavaScript files for a specific page
 * @param {string} pageName - Name of the page/bundle
 * @param {string[]} jsFiles - Array of JavaScript file paths
 * @param {string} destination - Output directory for processed files
 * @returns {NodeJS.ReadWriteStream} Gulp stream
 */
function processJS(pageName, jsFiles, destination) {
    return gulp.src(jsFiles)
        .pipe(sourcemaps.init())
        .pipe(concat(`${pageName}.js`))
        // Save unminified version
        .pipe(gulp.dest(destination))
        .pipe(uglify({
            // Optional: customize uglify options
            compress: {
                drop_console: true,
                dead_code: true
            },
            mangle: true
        }))
        .pipe(rename({
            suffix: '.min'
        }))
        // Generate source map
        .pipe(sourcemaps.write('.'))
        // Add hash for cache-busting
        .pipe(rev())
        // Save minified version
        .pipe(gulp.dest(destination));
}

/**
 * Process CSS files for a specific page
 * @param {string} pageName - Name of the page/bundle
 * @param {string[]} cssFiles - Array of CSS file paths
 * @param {string} destination - Output directory for processed files
 * @returns {NodeJS.ReadWriteStream} Gulp stream
 */
function processCSS(pageName, cssFiles, destination) {
    return gulp.src(cssFiles)
        .pipe(sourcemaps.init())
        .pipe(concat(`${pageName}.css`))
        // Save unminified version
        .pipe(gulp.dest(destination))
        .pipe(cleanCSS({
            // Optional: customize clean-css options
            level: {
                1: {
                    // Remove all comments
                    specialComments: 0
                }
            }
        }))
        .pipe(rename({
            suffix: '.min'
        }))
        // Generate source map
        .pipe(sourcemaps.write('.'))
        // Add hash for cache-busting
        .pipe(rev())
        // Save minified version
        .pipe(gulp.dest(destination));
}

module.exports = {
    processJS,
    processCSS
};