(function() {
  // Initialize the Firebase SDK
  firebase.initializeApp({
    apiKey: "AIzaSyC5IcRccDo289TTRa3Y7qJIu8YPz3EnKAI",
    databaseURL: "https://geofire-9d0de.firebaseio.com"
  });

  // Generate a random Firebase location
  var firebaseRef = firebase.database().ref().push();

  // Create a new GeoFire instance at the random Firebase location
  var geoFire = new GeoFire(firebaseRef);

  // Specify the locations for each fish
  var fishLocations = [
    [-16.130262, 153.605347],   // Coral Sea
    [-66.722541, -167.019653],  // Southern Ocean
    [-41.112469, 159.054565],   // Tasman Sea
    [30.902225, -166.66809]     // North Pacific Ocean
  ];

  // Set the initial locations of the fish in GeoFire
  log("*** Setting initial locations ***");
  var promises = fishLocations.map(function(location, index) {
    return geoFire.set("fish" + index, location).then(function() {
      log("fish" + index + " initially set to [" + location + "]");
    });
  });

  // Once all the fish are in GeoFire, update some of their positions
  var newLocation;
  RSVP.allSettled(promises).then(function() {
    log("*** Updating locations ***");
    newLocation = [-53.435719, 140.808716];
    return geoFire.set("fish1", newLocation);
  }).then(function() {
    log("fish1 moved to [" + newLocation + "]");

    newLocation = [56.83069, 1.94822];
    return geoFire.set("fish2", newLocation);
  }).then(function() {
    log("fish2 moved to [" + newLocation + "]");

    return geoFire.remove("fish0");
  }).then(function() {
    log("fish0 removed from GeoFire");

    log("*** Use the controls above to retrieve a fish's location ***");
  }).catch(function(error) {
    // Error case
    log(error);
  });

  // Log the location of the selected fish every time the get fish location button is clicked
  document.getElementById("getFishLocation").addEventListener("click", function() {
    var selectedFishKey = document.getElementById("fishSelect").value;

    geoFire.get(selectedFishKey).then(function(location) {
      if (location === null) {
        log( selectedFishKey + " is not in GeoFire");
      }
      else {
        log(selectedFishKey + " is at location [" + location + "]");
      }
    });
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
