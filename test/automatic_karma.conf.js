// Configuration file for Karma
// http://karma-runner.github.io/0.10/config/configuration-file.html

module.exports = function(config) {
  config.set({
    frameworks: ['jasmine'],
    files: [
      '../geofire.js',
      'geofire.spec.js'
    ],

    autoWatch: true,
    //Recommend starting Chrome manually with experimental javascript flag enabled, and open localhost:9876.
    browsers: ['Chrome']
  });
};
