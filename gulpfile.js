var gulp = require('gulp');
var streamqueue = require('streamqueue');
var jshint = require('gulp-jshint');
var jasmine = require('gulp-jasmine');
var karma = require('gulp-karma');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

var paths = {
  scripts: ['lib/*.js'],
};

gulp.task('scripts', function() {

  //Load the code, and process it.
  var code = gulp.src(paths.scripts)
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(uglify());

  //wrap it with headers and footers to namespace it
  var stream = streamqueue({ objectMode: true });
  stream.queue(gulp.src('build/header'));
  stream.queue(code);
  stream.queue(gulp.src('build/footer'));

  //and output it.
  return stream.done()
    .pipe(concat('geofire.min.js'))
    .pipe(gulp.dest('dist'));
});

gulp.task('test', function() {
  //Run the jasmine tests.
  gulp.src('tests/geofire.spec.js')
    .pipe(jasmine());
});

gulp.task('default', ['test', 'scripts']);
