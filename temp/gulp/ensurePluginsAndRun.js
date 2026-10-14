// File: utils/ensurePluginsAndRun.js
const { execSync } = require('child_process');
const chalk = require('chalk');

/**
 * Ensures all required plugins are installed.
 * @param {Function} done - The Gulp task callback to execute after plugins are verified/installed.
 */

// ✅ Updated plugin list (core modules removed, duplicates cleaned)
const requiredPlugins = [
  'del',
  'sass',
  'gulp-json-minify',
  'gulp-flatten',
  'gulp-string-replace',
  'merge-stream',
  'gulp-sftp-up4',
  'gulp-zip',
  'moment',
  'gulp-notify',
  'gulp',
  'chalk',
  'xmldom',
  'through2',
  'gulp-noop',
  'gulp-sass',
  'gulp-clean',
  'gulp-concat',
  'gulp-uglify',
  'gulp-terser',
  'gulp-rename',
  'gulp-htmlmin',
  'gulp-replace',
  'gulp-clean-css',
  'gulp-sourcemaps',
  'gulp-pretty-data',
  'gulp-jshint',
  'gulp-strip-comments',
  'gulp-strip-css-comments',
  'gulp-remove-empty-lines'
];

function ensurePluginsAndRun(done) {
  const missing = [];

  requiredPlugins.forEach((plugin) => {
    try {
      // Check if installed
      require.resolve(plugin);
      console.log(chalk.green(`✅ Plugin '${plugin}' is installed.`));
    } catch {
      console.log(chalk.yellow(`⚠️ Plugin '${plugin}' is missing.`));
      missing.push(plugin);
    }
  });

  if (missing.length > 0) {
    console.log(chalk.blue(`📦 Installing missing plugins: ${missing.join(', ')}`));
    try {
      execSync(`npm install ${missing.join(' ')} --save-dev`, { stdio: 'inherit' });
      console.log(chalk.green(`✅ All missing plugins installed successfully.`));
    } catch (err) {
      console.error(chalk.red(`❌ Failed to install plugins: ${err.message}`));
      // Exit if installation fails
      process.exit(1);
    }
  }

  done();
}

module.exports = {
  ensurePluginsAndRun
};