"use strict";

/**************/
/*  REQUIRES  */
/**************/
var gulp = require("gulp");
var runSequence = require("run-sequence");

// File IO
var exit = require("gulp-exit");
var concat = require("gulp-concat");
var jshint = require("gulp-jshint");
var uglify = require("gulp-uglify");
var extReplace = require("gulp-ext-replace");
var streamqueue = require("streamqueue");

// Testing
var mocha = require("gulp-mocha");
var istanbul = require("gulp-istanbul");


/****************/
/*  FILE PATHS  */
/****************/
var paths = {
  destDir: "dist",

  srcFiles: [
    "src/*.js"
  ],

  testFiles: [
    "tests/helpers.js",
    "tests/specs/geoCallbackRegistration.spec.js",
    "tests/specs/geoFire.spec.js",
    "tests/specs/geoFireUtils.spec.js"
  ]
};


/***********/
/*  TASKS  */
/***********/
// Lints the JavaScript files
gulp.task("lint", function() {
  var filesToLint = [paths.destDir + "/geofire.js", "gulpfile.js"];
  return gulp.src(filesToLint)
    .pipe(jshint())
    .pipe(jshint.reporter("jshint-stylish"))
    .pipe(jshint.reporter("fail"));
});

/* Builds the distribution files */
gulp.task("build", function() {
  // Concatenate all src files together
  var stream = streamqueue({ objectMode: true });
  stream.queue(gulp.src("build/header"));
  stream.queue(gulp.src(paths.srcFiles));
  stream.queue(gulp.src("build/footer"));

  // Output the final concatenated script file
  return stream.done()
    // Rename file
    .pipe(concat("geofire.js"))

    // Write un-minified version
    .pipe(gulp.dest(paths.destDir))

    // Minify
    .pipe(uglify({
      preserveComments: "some"
    }))

    // Change the file extension
    .pipe(extReplace(".min.js"))

    // Write minified version
    .pipe(gulp.dest(paths.destDir))

    // Write minified version to the examples directories
    .pipe(gulp.dest("examples/fish1/js/vendor/"))
    .pipe(gulp.dest("examples/fish2/js/vendor/"))
    .pipe(gulp.dest("examples/fish3/js/vendor/"))
    .pipe(gulp.dest("examples/sfVehicles/js/vendor/"))
    .pipe(gulp.dest("examples/queryBuilder/js/vendor/"))
    .pipe(gulp.dest("examples/html5Geolocation/js/vendor/"));
});

// Runs the Mocha test suite
gulp.task("test", function() {
  return gulp.src(paths.destDir + "/geofire.js")
    .pipe(istanbul())
    .pipe(istanbul.hookRequire())
    .on("finish", function() {
      gulp.src(paths.testFiles)
        .pipe(mocha({
          reporter: "spec",
          timeout: 5000
        }))
        .pipe(istanbul.writeReports())
        .pipe(exit());
    });
});

// Re-lints and re-builds every time a source file changes
gulp.task("watch", function() {
  gulp.watch(["build/*", paths.srcFiles], function() {
    runSequence("build", "lint");
  });
});

// Default task
gulp.task("default", function(done) {
  runSequence("build", "lint", "test", function(error) {
    done(error && error.err);
  });
});
