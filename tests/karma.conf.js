// Configuration file for Karma test runner
module.exports = function(config) {
  config.set({
    frameworks: ["jasmine"],
    preprocessors: {
      "../src/*.js": "coverage"
    },
    reporters: ["spec", "failed", "coverage"],
    coverageReporter: {
      type: "text-summary"
    },
    browsers: ["PhantomJS"],
    browserNoActivityTimeout: 30000
  });
};
