/**************/
/*  REQUIRES  */
/**************/
var gulp = require("gulp");
var streamqueue = require("streamqueue");
var karma = require("gulp-karma");
var concat = require("gulp-concat");
var jshint = require("gulp-jshint");
var uglify = require("gulp-uglify");

/****************/
/*  FILE PATHS  */
/****************/
var paths = {
  scripts: [
    "lib/geofire.js",
    "lib/geo-utils.js"
  ],

  tests: [
    "bower_components/firebase/firebase.js",
    "bower_components/rsvp/rsvp.min.js",
    "lib/*.js",
    "tests/geofire.spec.js"
  ]
};

/***********/
/*  TASKS  */
/***********/
/* Lints, minifies, and concatenates the script files */
gulp.task("scripts", function() {
  var code = gulp.src(paths.scripts)
    // Lint
    .pipe(jshint())
    .pipe(jshint.reporter("jshint-stylish"))

    // Minify
    .pipe(uglify());

  // Wrap code with a header and footer to namespace it
  var stream = streamqueue({ objectMode: true });
  stream.queue(gulp.src("build/header"));
  stream.queue(code);
  stream.queue(gulp.src("build/footer"));

  // Output the final concatenated script file
  return stream.done()
    .pipe(concat("geofire.min.js"))
    .pipe(gulp.dest("dist"));
});

/* Uses the Karma test runner to run the Jasmine tests */
gulp.task("test", function() {
  return gulp.src(paths.tests)
    .pipe(karma({
      configFile: "karma.conf.js",
      action: "run"
    }))
    .on("error", function(err) {
      throw err;
    });
});

/* Re-runs the "scripts" task every time a script file changes */
gulp.task("watch", function() {
  gulp.watch(paths.scripts, ["scripts"]);
});

/* Runs the "test" and "scripts" tasks by default */
gulp.task("default", ["test", "scripts"]);
