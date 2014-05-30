(function() {
  // Generate a random Firebase location
  var firebaseRef = new Firebase("https://" + randomString(10) + ".firebaseio-demo.com/");
  console.log(firebaseRef.toString());

  // Create a new geoFire instance at the random Firebase location
  var geoFire = new GeoFire(firebaseRef);

  // Create four Fish objects
  var fishList = [
    new Fish("fish1", "Salmon", "Pink"),
    new Fish("fish2", "Rainbow", "White"),
    new Fish("fish3", "Chocolate", "Red"),
    new Fish("fish4", "Goldfish", "Green")
  ];

  // Create the locations for each fish
  var fishLocations = [
    [-16.130262, 153.605347],   // Coral Sea
    [-66.722541, -167.019653],  // Southern Ocean
    [-41.112469, 159.054565],   // Tasman Sea
    [30.902225, -166.66809]     // North Pacific Ocean
  ];

  // Create a geo query centered at fish3
  var geoQuery = geoFire.query({
    center: fishLocations[2],
    radius: 3000
  });

  // Set events on the geo query
  var onKeyEnteredRegistration = geoQuery.on("key_entered", function(key, location) {
    log(key + " entered our query. Hi " + key + "!");
  });

  var onKeyMovedRegistration = geoQuery.on("key_moved", function(key, location) {
    log(key + " moved to somewere else within our query.");
  });

  var onKeyExitedRegistration = geoQuery.on("key_exited", function(key, location) {
    log(key + " migrated out of our query. Bye bye :(");
  });

  // Set the initial locations of each fish in geoFire
  log("*** Setting initial locations ***");
  var promises = fishList.map(function(fish, index) {
    return geoFire.set(fish.key, fishLocations[index]);
  });

  // Once all the fish are in geoFire, update some of their positions
  RSVP.allSettled(promises).then(function() {
    log("*** Updating locations ***");
    return geoFire.set("fish2", [-53.435719, 140.808716]);    // fires "key_entered"
  }).then(function() {
    return geoFire.set("fish3", [56.83069, 1.94822]);         // fires "key_exited"
  }).then(function() {
    return geoFire.set("fish1", [-20.93412, 143.23406]);      // fires "key_moved"
  }).then(function() {
    log("*** Unregistering \"key_exited\" ***");
    onKeyExitedRegistration.cancel();
    return geoFire.set("fish1", [-80.93521, 3.62056]);        // does not fire "key_exited" since it's callback registration was cancelled
  }).then(function() {
    return geoFire.set("fish4", [-20.93412, 143.23406]);      // fires "key_entered"
  }).then(function() {
    log("*** Cancelling entire query ***");
    geoQuery.cancel();
    return geoFire.set("fish2", [-52.14522, 145.52341]);      // does not fire "key_moved" since the whole query was cancelled
  }).then(function() {
    return geoFire.set("fish1", [-56.32513, 147.02952]);      // does not fire "key_entered" since the whoel query was cancelled
  });


  /*************/
  /*  HELPERS  */
  /*************/
  /* Returns a random string of the inputted length */
  function randomString(length) {
      var text = "";
      var validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for(var i = 0; i < length; i++) {
          text += validChars.charAt(Math.floor(Math.random() * validChars.length));
      }

      return text;
  }

  /* Creates a new Fish object */
  function Fish(key, type, color) {
      this.key = key;
      this.type = type;
      this.color = color;
  }

  function log(message) {
    var childDiv = document.createElement("div");
    var textNode = document.createTextNode(message);
    childDiv.appendChild(textNode);
    document.getElementById("log").appendChild(childDiv);
  }
})();