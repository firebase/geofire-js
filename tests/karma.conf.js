// Configuration file for Karma test runner
module.exports = function(config) {
  config.set({
    frameworks: ["jasmine"],
    preprocessors: {
      "../src/*.js": "coverage"
    },
    reporters: ["spec", "failed", "coverage"],
    coverageReporter: {
      reporters: [
        {
          type: "lcovonly",
          dir: "coverage",
          subdir: "."
        },
        {
          type: "text-summary"
        }
      ]
    },
    browsers: ["Firefox"],
    browserNoActivityTimeout: 30000
  });
};
