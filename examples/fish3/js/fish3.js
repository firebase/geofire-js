(function() {
  // Generate a random Firebase location
  var firebaseUrl = "https://" + generateRandomString(10) + ".firebaseio-demo.com/";
  var firebaseRef = new Firebase(firebaseUrl);

  // Set the URL of the link element to be the Firebase URL
  document.getElementById("firebaseRef").setAttribute("href", firebaseUrl);

  // Create a new GeoFire instance at the random Firebase location
  var geoFire = new GeoFire(firebaseRef);

  // Create the locations for each fish
  var fishLocations = [
    [-40, 159],
    [90, 70],
    [-46, 160],
    [0, 0]
  ];

  // Set the initial locations of the fish in GeoFire
  log("*** Setting initial locations ***");
  var promises = fishLocations.map(function(location, index) {
    return geoFire.set("fish" + index, location).then(function() {
      log("fish" + index + " initially set to [" + location + "]");
    });
  });

  // Once all the fish are in GeoFire, log a message that the user can now move fish around
  RSVP.allSettled(promises).then(function() {
    log("*** Creating GeoQuery ***");
    // Create a GeoQuery centered at fish2
    var geoQuery = geoFire.query({
      center: fishLocations[2],
      radius: 3000
    });

    var onKeyEnteredRegistration = geoQuery.on("key_entered", function(key, location) {
      log(key + " entered the query. Hi " + key + "!");
    });

    var onReadyRegistration = geoQuery.on("ready", function() {
      log("*** 'ready' event fired - cancelling query ***");
      geoQuery.cancel();
    })
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