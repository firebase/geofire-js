/**************/
/*  REQUIRES  */
/**************/
var gulp = require("gulp");

// File IO
var streamqueue = require("streamqueue");
var concat = require("gulp-concat");
var jshint = require("gulp-jshint");
var uglify = require("gulp-uglify");
var runSequence = require('run-sequence');

// Testing
var karma = require("gulp-karma");


/****************/
/*  FILE PATHS  */
/****************/
var paths = {
  destDir: "dist",

  scripts: {
    src: {
      dir: "src",
      files: [
        "src/*.js"
      ]
    },
    dest: {
      dir: "dist",
      files: {
        unminified: "geofire.js",
        minified: "geofire.min.js"
      }
    }
  },

  tests: {
    config: "tests/karma.conf.js",
    files: [
      "bower_components/firebase/firebase.js",
      "bower_components/rsvp/rsvp.min.js",
      "src/*.js",
      "tests/specs/*.spec.js"
    ]
  }
};


/***********/
/*  TASKS  */
/***********/
/* Lints, minifies, and concatenates the script files */
gulp.task("scripts", function() {
  // Concatenate all src files together
  var stream = streamqueue({ objectMode: true });
  stream.queue(gulp.src("build/header"));
  stream.queue(gulp.src(paths.scripts.src.files));
  stream.queue(gulp.src("build/footer"));

  // Output the final concatenated script file
  return stream.done()
    // Rename file
    .pipe(concat(paths.scripts.dest.files.unminified))

    // Lint
    .pipe(jshint())
    .pipe(jshint.reporter("jshint-stylish"))
    .pipe(jshint.reporter("fail"))
    .on("error", function(error) {
      throw error;
    })

    // Write un-minified version
    .pipe(gulp.dest(paths.scripts.dest.dir))

    // Minify
    .pipe(uglify({
      preserveComments: "some"
    }))

    // Rename file
    .pipe(concat(paths.scripts.dest.files.minified))

    // Write minified version to the distribution directory
    .pipe(gulp.dest(paths.scripts.dest.dir));
});

/* Uses the Karma test runner to run the Jasmine tests */
gulp.task("test", function() {
  return gulp.src(paths.tests.files)
    .pipe(karma({
      configFile: paths.tests.config,
      action: "run"
    }))
    .on("error", function(error) {
      throw error;
    });
});

/* Re-runs the "scripts" task every time a script file changes */
gulp.task("watch", function() {
  gulp.watch(["build/*", paths.scripts.src.dir + "/**/*"], ["scripts"]);
});

/* Builds the distribution files */
gulp.task("build", ["scripts"]);

/* Runs the "test" and "scripts" tasks by default */
gulp.task("default", function(done) {
  runSequence("scripts", "test", function(error) {
    done(error && error.err);
  });
});
