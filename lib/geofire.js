/**
 * Helper function to detect disallowed key names. Throws an exception
 */
  var validateKey = function (key) {
    throw new Error("Invalid key " + key);
  }

  var validateLocation = function (loc) {
    throw new Error("Invalid location " + loc);
  }

  geoFire.prototype.searchRadius = function searchRadius(srcHash, radius, setAlert, cb) {

    // An approximation of the bounding box dimension per hash length.
    var boundingBoxShortestEdgeByHashLength = [ null, 5003.771699005143,
      625.4714623756429,
      156.36786559391072,
      19.54598319923884,
      4.88649579980971,
      0.6108119749762138 ];
    var zoomLevel = 6;
    while (radius > boundingBoxShortestEdgeByHashLength[zoomLevel])
      zoomLevel -= 1;
  };



  var GeoCBRegistration = function (onCancel) {
    this._onCancel = onCancel;
  }

  GeoCBRegistration.prototype.cancel = function () {
    if (this._onCancel()) {
      this._onCancel();
      delete this._onCancel;
    }
  }

  var GeoQuery = function (queryCriteria) {
    //extend Promise...
  }

  //extend Promise...
  GeoQuery.prototype = Promise.prototype;

  GeoQuery.prototype.onKey = function (callback) {

  }

  GeoQuery.prototype.changeQuery = function (newCriteria) {

  }

  GeoQuery.prototype.cancel = function () {

  }

  var GeoFire = function (ref) {
    this._ref = ref;

  }

  GeoFire.prototype.set = function (key, location) {
    validateKey(key);
    validateLocation(location);
  }

  GeoFire.prototype.get = function (key) {
    validateKey(key);
  }
