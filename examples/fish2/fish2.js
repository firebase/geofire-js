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
    type: "circle",
    center: fishLocations[2],
    radius: 3000
  });

  // Set events on the geo query
  var onKeyEnteredRegistration = geoQuery.onKeyEntered(function(key, location) {
    log(key + " entered our query. Hi " + key + "!");

    document.getElementById(key + "Inside").style.display = "block";
    document.getElementById(key + "Outside").style.display = "none";
  });

  var onKeyMovedRegistration = geoQuery.onKeyMoved(function(key, location) {
    log(key + " moved to somewere else within our query.");
  });

  var onKeyLeftRegistration = geoQuery.onKeyLeft(function(key, location) {
    log(key + " migrated out of our query. Bye bye :(");

    document.getElementById(key + "Inside").style.display = "none";
    document.getElementById(key + "Outside").style.display = "block";
  });

  // Set the initial locations of each fish in geoFire
  log("*** Setting initial locations ***");
  var promises = fishList.map(function(fish, index) {
    document.getElementById(fish.key + "Inside").style.display = "none";
    return geoFire.set(fish.key, fishLocations[index]);
  });

  // Once all the fish are in geoFire, update some of their positions
  RSVP.allSettled(promises).then(function() {
    log("*** Updating locations ***");
  });

  document.getElementById("moveFishButton").addEventListener("click", function() {
    var selectedFish = document.getElementById("fishSelect").value;
    var selectedLocation = document.getElementById("locationSelect").value;

    var newLocations = {
      "fish1": {
        "inside": [-40, 159],
        "outside": [60, 80]
      },
      "fish2": {
        "inside": [-44, 170],
        "outside": [90, 70]
      },
      "fish3": {
        "inside": [-46, 160],
        "outside": [88, 88]
      },
      "fish4": {
        "inside": [-43, 145],
        "outside": [0, 0]
      }
    };

    geoFire.set(selectedFish, newLocations[selectedFish][selectedLocation]);
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