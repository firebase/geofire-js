(function() {
  // Generate a random Firebase location
  var firebaseUrl = "https://" + generateRandomString(10) + ".firebaseio-demo.com/";
  var firebaseRef = new Firebase(firebaseUrl);

  // Set the URL of the link element to be the Firebase URL
  document.getElementById("firebaseRef").setAttribute("href", firebaseUrl);

  // Create a new GeoFire instance at the random Firebase location
  var geoFire = new GeoFire(firebaseRef);
  var geoQuery;

  $("#addfish").on("submit", function() {
    var lat = parseFloat($("#addlat").val());
    var lon = parseFloat($("#addlon").val());
    var myID = "fish-" + generateRandomString(10);

    geoFire.set(myID, [lat, lon]).then(function() {
      log(myID + ": setting position to [" + lat + "," + lon + "]");
    });

    return false;
  });

  $("#queryfish").on("submit", function() {
    var lat = parseFloat($("#querylat").val());
    var lon = parseFloat($("#querylon").val());
    var radius = parseFloat($("#queryradius").val());
    var operation;

    if (typeof geoQuery !== "undefined") {
      operation = "Updating";

      geoQuery.updateCriteria({
        center: [lat, lon],
        radius: radius
      });

    } else {
      operation = "Creating";

      geoQuery = geoFire.query({
        center: [lat, lon],
        radius: radius
      });

      geoQuery.on("key_entered", function(key, location, distance) {
        log(key + " is located at [" + location + "] which is within the query (" + distance.toFixed(2) + " km from center)");
      });

      geoQuery.on("key_exited", function(key, location, distance) {
        console.log(key, location, distance);
        log(key + " is located at [" + location + "] which is no longer within the query (" + distance.toFixed(2) + " km from center)");
      });
    }

    log(operation + " the query: centered at [" + lat + "," + lon + "] with radius of " + radius + "km")

    return false;
  });

  /*************/
  /*  HELPERS  */
  /*************/
  /* Returns a random string of the inputted length */
  function generateRandomString(length) {
      var text = "";
      var validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for(var i = 0; i < length; i++) {
          text += validChars.charAt(Math.floor(Math.random() * validChars.length));
      }

      return text;
  }

  /* Logs to the page instead of the console */
  function log(message) {
    var childDiv = document.createElement("div");
    var textNode = document.createTextNode(message);
    childDiv.appendChild(textNode);
    document.getElementById("log").appendChild(childDiv);
  }
})();