/**************/
/*  REQUIRES  */
/**************/
var gulp = require("gulp");

// File IO
var streamqueue = require("streamqueue");
var concat = require("gulp-concat");
var jshint = require("gulp-jshint");
var uglify = require("gulp-uglify");

// Testing
var karma = require("gulp-karma");

// Live-reload
var express = require("express");
var livereload = require('connect-livereload');
var refresh = require('gulp-livereload');
var lrserver = require('tiny-lr')();

/****************/
/*  FILE PATHS  */
/****************/
var paths = {
  destDir: "dest",
  scripts: {
    src: [
      "src/geo-utils.js",
      "src/geofire.js"
    ],
    srcDir: "src",
    destDir: "dest",
    unminified: "GeoFire.js",
    minified: "GeoFire.min.js"
  },

  tests: [
    "bower_components/firebase/firebase.js",
    "bower_components/rsvp/rsvp.min.js",
    "tests/geofire.spec.js",
    "src/*.js"
  ]
};

/***********/
/*  TASKS  */
/***********/
/* Lints, minifies, and concatenates the script files */
gulp.task("scripts", function() {
  // Concatenate all src files together
  var stream = streamqueue({ objectMode: true });
  stream.queue(gulp.src("build/header"));
  stream.queue(gulp.src(paths.scripts.src));
  stream.queue(gulp.src("build/footer"));

  // Output the final concatenated script file
  return stream.done()
    // Rename file
    .pipe(concat(paths.scripts.unminified))

    // Lint
    .pipe(jshint())
    .pipe(jshint.reporter("jshint-stylish"))

    // Write un-minified version
    .pipe(gulp.dest(paths.scripts.destDir))

    // Minify
    .pipe(uglify())

    // Rename file
    .pipe(concat(paths.scripts.minified))

    // Write minified version
    .pipe(gulp.dest(paths.scripts.destDir));
});

/* Uses the Karma test runner to run the Jasmine tests */
gulp.task("test", function() {
  return gulp.src(paths.tests)
    .pipe(karma({
      configFile: "tests/karma.conf.js",
      action: "run"
    }))
    .on("error", function(err) {
      throw err;
    });
});

/* Reloads the live-reload server */
gulp.task("reload", function(){
  gulp.src(paths.destDir + "/**/*")
    .pipe(refresh(lrserver));
});

/* Starts the live-reload server */
gulp.task("server", function() {
  // Set the ports
  var livereloadport = 35728;
  var serverport = 6060;

  // Configure the server and add live-reload middleware
  var server = express();
  server.use(livereload({
    port: livereloadport
  }));

  // Set up the static fileserver, which serves files in the dest dir
  server.use(express.static(__dirname));
  server.listen(serverport);

  // Set up the live-reload server
  lrserver.listen(livereloadport);
});

/* Re-runs the "scripts" task every time a script file changes */
gulp.task("watch", function() {
  gulp.watch(paths.scripts.srcDir + "/**/*", ["scripts"]);
  gulp.watch(["examples/**/*", paths.buildDir + "/**/*"], ["reload"]);
});

/* Starts the live-reload server and refreshes it everytime a dest file changes */
gulp.task("serve", ["scripts", "server", "watch"]);

/* Runs the "test" and "scripts" tasks by default */
gulp.task("default", ["test", "scripts"]);
