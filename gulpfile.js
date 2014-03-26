var gulp = require('gulp');
var jshint = require('gulp-jshint');
var header = require('gulp-header');
var jasmine = require('gulp-jasmine');
var karma = require('gulp-karma');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

var paths = {
  scripts: ['lib/geofire.js']
};

gulp.task('scripts', function() {
  // Minify and copy all JavaScript (except vendor scripts)
  return gulp.src(paths.scripts)
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(uglify())
    .pipe(concat('geofire.min.js'))
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['scripts']);
