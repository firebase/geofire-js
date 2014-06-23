// Global map variable
var map;

// Set the center as Firebase HQ
var locations = {
  "FirebaseHQ": [37.785326, -122.405696],
  "Caltrain": [37.7789, -122.3917]
};
var center = locations["FirebaseHQ"];

// Query radius
var radiusInKm = 0.5;

// Get a reference to the Firebase public transit open data set
var transitFirebaseRef = new Firebase("https://publicdata-transit.firebaseio.com/")

// Create a new GeoFire instance, pulling data from the public transit data
var geoFire = new GeoFire(transitFirebaseRef.child("_geofire"));

/*************/
/*  GEOQUERY */
/*************/
// Keep track of all of the vehicles currently within the query
var vehiclesInQuery = {};

// Create a new GeoQuery instance
var geoQuery = geoFire.query({
  center: center,
  radius: radiusInKm
});

/* Adds new vehicle markers to the map when they enter the query */
geoQuery.on("key_entered", function(vehicleId, vehicleLocation) {
  // Specify that the vehicle has entered this query
  vehicleId = vehicleId.split(":")[1];
  vehiclesInQuery[vehicleId] = true;

  // Look up the vehicle's data in the Transit Open Data Set
  transitFirebaseRef.child("sf-muni/vehicles").child(vehicleId).once("value", function(dataSnapshot) {
    // Get the vehicle data from the Open Data Set
    vehicle = dataSnapshot.val();

    // If the vehicle has not already exited this query in the time it took to look up its data in the Open Data
    // Set, add it to the map
    if (vehicle !== null && vehiclesInQuery[vehicleId] === true) {
      // Add the vehicle to the list of vehicles in the query
      vehiclesInQuery[vehicleId] = vehicle;

      // Create a new marker for the vehicle
      vehicle.marker = createVehicleMarker(vehicle, getVehicleColor(vehicle));
    }
  });
});

/* Moves vehicles markers on the map when their location within the query changes */
geoQuery.on("key_moved", function(vehicleId, vehicleLocation) {
  // Get the vehicle from the list of vehicles in the query
  vehicleId = vehicleId.split(":")[1];
  var vehicle = vehiclesInQuery[vehicleId];

  // Animate the vehicle's marker
  if (typeof vehicle !== "undefined" && typeof vehicle.marker !== "undefined") {
    vehicle.marker.animatedMoveTo(vehicleLocation);
  }
});

/* Removes vehicle markers from the map when they exit the query */
geoQuery.on("key_exited", function(vehicleId, vehicleLocation) {
  // Get the vehicle from the list of vehicles in the query
  vehicleId = vehicleId.split(":")[1];
  var vehicle = vehiclesInQuery[vehicleId];

  // If the vehicle's data has already been loaded from the Open Data Set, remove its marker from the map
  if (vehicle !== true) {
    vehicle.marker.setMap(null);
  }

  // Remove the vehicle from the list of vehicles in the query
  delete vehiclesInQuery[vehicleId];
});

/*****************/
/*  GOOGLE MAPS  */
/*****************/
/* Initializes Google Maps */
function initializeMap() {
  // Get the location as a Google Maps latitude-longitude object
  var loc = new google.maps.LatLng(center[0], center[1]);

  // Create the Google Map
  map = new google.maps.Map(document.getElementById("map-canvas"), {
    center: loc,
    zoom: 15,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  // Create a draggable circle centered on the map
  var circle = new google.maps.Circle({
    strokeColor: "#6D3099",
    strokeOpacity: 0.7,
    strokeWeight: 1,
    fillColor: "#B650FF",
    fillOpacity: 0.35,
    map: map,
    center: loc,
    radius: ((radiusInKm) * 1000),
    draggable: true
  });

  //Update the query's criteria every time the circle is dragged
  var updateCriteria = _.debounce(function() {
    var latLng = circle.getCenter();
    geoQuery.updateCriteria({
      center: [latLng.lat(), latLng.lng()],
      radius: radiusInKm
    });
  }, 10);
  google.maps.event.addListener(circle, "drag", updateCriteria);
}

/**********************/
/*  HELPER FUNCTIONS  */
/**********************/
/* Adds a marker for the inputted vehicle to the map */
function createVehicleMarker(vehicle, vehicleColor) {
  var marker = new google.maps.Marker({
    icon: "https://chart.googleapis.com/chart?chst=d_bubble_icon_text_small&chld=" + vehicle.vtype + "|bbT|" + vehicle.routeTag + "|" + vehicleColor + "|eee",
    position: new google.maps.LatLng(vehicle.lat, vehicle.lon),
    optimized: true,
    map: map
  });

  return marker;
}

/* Returns a blue color code for outbound vehicles or a red color code for inbound vehicles */
function getVehicleColor(vehicle) {
  return ((vehicle.dirTag && vehicle.dirTag.indexOf("OB") > -1) ? "50B1FF" : "FF6450");
}

/* Returns true if the two inputted coordinates are approximately equivalent */
function coordinatesAreEquivalent(coord1, coord2) {
  return (Math.abs(coord1 - coord2) < 0.000001);
}

/* Animates the Marker class (based on https://stackoverflow.com/a/10906464) */
google.maps.Marker.prototype.animatedMoveTo = function(newLocation) {
  var toLat = newLocation[0];
  var toLng = newLocation[1];

  var fromLat = this.getPosition().lat();
  var fromLng = this.getPosition().lng();

  if (!coordinatesAreEquivalent(fromLat, toLat) || !coordinatesAreEquivalent(fromLng, toLng)) {
    var percent = 0;
    var latDistance = toLat - fromLat;
    var lngDistance = toLng - fromLng;
    var interval = window.setInterval(function () {
      percent += 0.01;
      var curLat = fromLat + (percent * latDistance);
      var curLng = fromLng + (percent * lngDistance);
      var pos = new google.maps.LatLng(curLat, curLng);
      this.setPosition(pos);
      if (percent >= 1) {
        window.clearInterval(interval);
      }
    }.bind(this), 50);
  }
};
