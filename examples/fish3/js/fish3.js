(function() {
  // Initialize the Firebase SDK
  firebase.initializeApp({
    apiKey: "AIzaSyCR4ND2xwX3kU1IxTn0youF5OlI3x6MFZs",
    databaseURL: "https://geofire-gh-tests.firebaseio.com",
    projectId: "geofire-gh-tests"
  });

  // Generate a random Firebase location
  var firebaseRef = firebase.database().ref().push();

  // Create a new GeoFire instance at the random Firebase location
  var geoFireInstance = new geofire.GeoFire(firebaseRef);

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
    return geoFireInstance.set("fish" + index, location).then(function() {
      log("fish" + index + " initially set to [" + location + "]");
    });
  });

  // Once all the fish are in GeoFire, log a message that the user can now move fish around
  RSVP.allSettled(promises).then(function() {
    log("*** Creating GeoQuery ***");
    // Create a GeoQuery centered at fish2
    var geoQuery = geoFireInstance.query({
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
  /* Logs to the page instead of the console */
  function log(message) {
    var childDiv = document.createElement("div");
    var textNode = document.createTextNode(message);
    childDiv.appendChild(textNode);
    document.getElementById("log").appendChild(childDiv);
  }
})();
