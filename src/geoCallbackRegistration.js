/**
 * Creates a GeoCallbackRegistration instance.
 *
 * @constructor
 * @this {GeoCallbackRegistration}
 * @callback cancelCallback Callback to run when this callback registration is cancelled.
 */
var GeoCallbackRegistration = function(cancelCallback) {
  /********************/
  /*  PUBLIC METHODS  */
  /********************/
  /**
   * Cancels this callback registration so that it no longer fires its callback. This
   * has no effect on any other callback registrations you may have created.
   */
  this.cancel = function() {
    if (typeof _cancelCallback !== "undefined") {
      _cancelCallback();
      _cancelCallback = undefined;
    }
  };

  /*****************/
  /*  CONSTRUCTOR  */
  /*****************/
  if (typeof cancelCallback !== "function") {
    throw new Error("callback must be a function");
  }

  var _cancelCallback = cancelCallback;
};