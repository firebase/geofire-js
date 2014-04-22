var gulp = require('gulp');
var streamqueue = require('streamqueue');
var jshint = require('gulp-jshint');
var karma = require('gulp-karma');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

var distFiles = {
  scripts: ['lib/*.js'],
};

var testFiles = [
  'bower_components/firebase/firebase.js',
  'bower_components/rsvp/rsvp.min.js',
  'lib/*.js',
  'tests/geofire.spec.js'
];

gulp.task('scripts', function() {

  //Load the code, and process it.
  var code = gulp.src(distFiles.scripts)
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
  // Be sure to return the stream
  return gulp.src(testFiles)
    .pipe(karma({
      configFile: 'tests/automatic_karma.conf.js',
      action: 'run'
    }))
    .on('error', function(err) {
      // Make sure failed tests cause gulp to exit non-zero
      throw err;
    });
});

gulp.task('default', ['test', 'scripts']);
