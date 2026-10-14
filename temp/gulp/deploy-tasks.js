// utils\deploy-tasks.js


/* 

# Default UAT deployment
gulp deploy

# Deploy to specific environment
DEPLOY_ENV=DEV gulp deploy

# Deploy with specific version
VERSION=2.99.009 gulp deploy

*/
const gulp = require('gulp');
const sftp = require('gulp-sftp-up4');
const zip = require('gulp-zip');
const moment = require('moment');
const path = require('path');
const through2Module = require('through2');
const through2 = through2Module.default || through2Module.transform || through2Module;

const config = {
  environments: {
    UAT: {
      host: 'sftp.newgen.co',
      user: 'impact-uat',
      password: 'Welcome@123$',
      deployPath: '/home/SFTP_DATA/IMPACT/common/UAT_CODE/in/',
      backupPath: '/home/SFTP_DATA/IMPACT/common/UAT_CODE/moved/'
    },
    DEV: {
      host: 'sftp.newgen.co',
      user: 'IMPACT',
      password: 'C(&7}wqM',
      deployPath: '/home/SFTP_DATA/IMPACT/common/UAT_CODE/in/',
      backupPath: '/home/SFTP_DATA/IMPACT/common/UAT_CODE/moved/'
    }
  }
};

class DeploymentTasks {
  constructor(options = {}) {
    this.options = {
      distPath: 'dist',
      zipName: `deploy-${moment().format('YYYYMMDD-HHmmss')}.zip`,
      environment: 'UAT',      
      ...options
    };
    this.result = {
      success: false,
      zipPath: '',
      uploadedFiles: [],
      error: null,
      startTime: null,
      endTime: null,
      duration: null
    };
  }

  // Create zip from dist folder
  createZip() {
    return new Promise((resolve, reject) => {
      this.result.startTime = new Date();
      const zipPath = path.join('temp', this.options.zipName);
      this.result.zipPath = zipPath;

      gulp.src(`${this.options.distPath}/**/*`)
        .pipe(zip(this.options.zipName))
        .pipe(gulp.dest('temp'))
        .pipe(through2.obj((chunk, enc, cb) => {
          this.result.uploadedFiles.push(chunk.path);
          cb(null, chunk);
        }))
        .on('end', () => resolve(this.result))
        .on('error', (err) => {
          this.result.error = err;
          reject(this.result);
        });
    });
  }

  // Upload zip to FTP
  uploadToFtp() {
    return new Promise((resolve, reject) => {
      const envConfig = config.environments[this.options.environment];

      if (!envConfig) {
        this.result.error = new Error(`Invalid environment: ${this.options.environment}`);
        reject(this.result);
        return;
      }

      gulp.src(this.result.zipPath)
        .pipe(sftp({
          host: envConfig.host,
          user: envConfig.user,
          password: envConfig.password,
          remotePath: envConfig.deployPath
        }))
        .pipe(through2.obj((chunk, enc, cb) => {
          this.result.uploadedFiles.push({
            local: chunk.path,
            remote: path.join(envConfig.deployPath, path.basename(chunk.path))
          });
          cb(null, chunk);
        }))
        .on('end', () => {
          this.result.success = true;
          this.result.endTime = new Date();
          this.result.duration = this.result.endTime - this.result.startTime;
          resolve(this.result);
        })
        .on('error', (err) => {
          this.result.error = err;
          this.result.endTime = new Date();
          this.result.duration = this.result.endTime - this.result.startTime;
          reject(this.result);
        });
    });
  }

  // Main deploy method that orchestrates the process
  async deploy() {
    try {
      await this.createZip();
      await this.uploadToFtp();
      return this.result;
    } catch (error) {
      this.result.error = error;
      return this.result;
    }
  }
}

module.exports = DeploymentTasks;