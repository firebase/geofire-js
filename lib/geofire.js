/**
 * Helper functions to detect invalid inputs
 */
var validateKey = function (key) {
  //throw new Error("Invalid key " + key);
};

var validateLocation = function (loc) {
  //throw new Error("Invalid location " + loc);
};


/**
 * GeoQuery constructor
 */
var GeoQuery = function (queryCriteria) {
  //extend Promise...
};

GeoQuery.prototype.getInitialResults = function() {

};

GeoQuery.prototype.onKeyEntered = function(callback) {

};

GeoQuery.prototype.onKeyMoved = function(callback) {

};

GeoQuery.prototype.onKeyLeft = function(callback) {

};

GeoQuery.prototype.updateQueryCriteria = function (newCriteria) {

};

GeoQuery.prototype.cancel = function () {

};


/**
 * Callback registration, used to cancel outstanding callbacks.
 */
var GeoCallbackRegistration = function (onCancel) {
  this._onCancel = onCancel;
};

GeoCallbackRegistration.prototype.cancel = function () {
  if (this._onCancel()) {
    this._onCancel();
    delete this._onCancel;
  }
};

/**
 * GeoFire API - This is the only public symbol we expose.
 */
var GeoFire = function (ref) {
  this._ref = ref;

};

/**
 * @return a promise that is fulfilled when the write is complete.
 */
GeoFire.prototype.set = function (key, location) {
  validateKey(key);
  validateLocation(location);

  //TODO - make this actually get resolved properly.
  var promise = new RSVP.Promise(function(resolve, reject) {
    // succeed
    resolve(true);
  });
  return promise;
};

/**
 * @return a promise that is fulfilled with the data.
 */
GeoFire.prototype.get = function (key) {
  validateKey(key);

  var promise = new RSVP.Promise(function(resolve, reject) {
    // succeed
    resolve([1,2]);
  });
  return promise;
};

/**
 * Creates a query object
 */
GeoFire.prototype.query = function(criteria) {

};
