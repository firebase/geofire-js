// Configuration file for Karma test runner
module.exports = function(config) {
  config.set({
    frameworks: ["jasmine"],

    files: [
      "../bower_components/firebase/firebase.js",
      "../bower_components/rsvp/rsvp.min.js",
      "../dest/geofire.js",
      "geofire.spec.js",
      "geo-utils.spec.js"
    ],

    browsers: ["Chrome"]
  });
};