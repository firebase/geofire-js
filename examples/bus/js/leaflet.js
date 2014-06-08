var map, circle;
var geoQuery;

var locations = {
  "FirebaseHQ": [37.785326, -122.405696],
  "Caltrain": [37.7789, -122.3917]
};
var center = locations["FirebaseHQ"];
var radiusInKm = 0.75;

// Get a reference to the SF Muni public transit data
//var muniFirebaseRef = new Firebase("https://publicdata-transit.firebaseio.com/sf-muni/data");
var muniFirebaseRef = new Firebase("https://busroutes.firebaseio-demo.com/sf-muni/");

// For the search
// TODO: use a firebase at my account and have vikrum lift limits
// TODO: add index.html in examples dir with notes about the
// rename dest to dist
// take out vendor files from dest
// make keys be strings instead or numbers or strings
var demoFirebaseRef = new Firebase("https://busRoutesGeoFire.firebaseio-demo.com/");
var geoFire = new GeoFire(demoFirebaseRef);

/*var sourceVehicleIds = [];
muniFirebaseRef.on("child_added", function(dataSnapshot) {
  var vehicleId = dataSnapshot.name();
  sourceVehicleIds.push(vehicleId);
});
demoFirebaseRef.child("indices").on("child_removed", function() {
  console.assert(false, "source vehicle removed");
});

var indicesVehicleIds = [];
var numIndicesDupes = 0;
demoFirebaseRef.child("indices").on("child_added", function(dataSnapshot) {
  var vehicleId = dataSnapshot.name().slice(12);
  if (indicesVehicleIds.indexOf(vehicleId) !== -1) {
    console.log(vehicleId);
    numIndicesDupes++;
  }
  indicesVehicleIds.push(vehicleId);
});
demoFirebaseRef.child("indices").on("child_removed", function() {
  console.assert(false, "indices vehicle removed");
});

var locationsVehicleIds = [];
demoFirebaseRef.child("locations").on("child_added", function(dataSnapshot) {
  var vehicleId = dataSnapshot.name();
  locationsVehicleIds.push(vehicleId);
});
demoFirebaseRef.child("locations").on("child_removed", function() {
  console.assert(false, "locations vehicle removed");
});

window.setTimeout(function() {
  console.log("Number of source vehicles: " + sourceVehicleIds.length);
  console.log(sourceVehicleIds);

  console.log("Number of indices: " + indicesVehicleIds.length);
  console.log("Number of indices dupes: " + numIndicesDupes);
  console.log(indicesVehicleIds);

  console.log("Number of locations: " + locationsVehicleIds.length);
  console.log(locationsVehicleIds);
}, 2000);*/

// Create a GeoQuery
geoQuery = geoFire.query({
  center: center,
  radius: radiusInKm
});

// Keep track of all of the vehicles currently within the query
var vehiclesInQuery = {};

/* Adds new vehicle markers to the map when they enter the query */
geoQuery.on("key_entered", function(vehicleId, vehicleLocation) {
  //console.log("Vehicle " + vehicleId + " entered the query.");

  // Verify state
  console.assert(typeof vehiclesInQuery[vehicleId] === "undefined", "Vehicle " + vehicleId + " should not already be in the vehicles list.");

  // Specify that the vehicle has entered this query
  vehiclesInQuery[vehicleId] = true;

  muniFirebaseRef.child(vehicleId).once("value", function(dataSnapshot) {
    // Get the vehicle data from the Open Data Set
    vehicle = dataSnapshot.val();

    // Verify the vehicle data is accurate
    console.assert(vehicle !== null, "Vehicle " + vehicleId + " should exist in the Open Data Set.");
    console.assert(parseInt(vehicle.id) === parseInt(vehicleId), "Vehicle " + vehicleId + " does not match the ID of vehicle " + vehicle.id + " stored in the Open Data Set.");
    console.assert(parseFloat(vehicle.lat) === parseFloat(vehicleLocation[0]), "Vehicle " + vehicleId + " has inaccurate latitude.");
    console.assert(parseFloat(vehicle.lon) === parseFloat(vehicleLocation[1]), "Vehicle " + vehicleId + " has inaccurate longitude.");

    // If the vehicle has not already exited this query in the time it took to look up its data in the Open Data
    // Set, add it to the map.
    if (vehiclesInQuery[vehicleId] === true) {
      // Add the vehicle to the list of vehicles in the query
      vehiclesInQuery[vehicleId] = vehicle;

      // Create a new marker for the vehicle
      //vehicle.marker = createVehicleMarker(vehicle, getVehicleColor(vehicle));
      var line = L.polyline([vehicleLocation]);
      vehicle.marker = L.animatedMarker(line.getLatLngs(), {
        icon: L.divIcon({
          // Specify a class name we can refer to in CSS.
          className: 'vehicleMarker',
          // Define what HTML goes in each marker.
          html: "<div>" + vehicleId + "</div>",
          // Set a markers width and height.
          iconSize: [40, 20]
        }),
        //distance: 300,  // meters
        interval: 500, // milliseconds
        autoStart: false
      }).addTo(map);

      // Add the vehicle to the location console
      $("#location-console ul").append("<li id='vehicle" + vehicleId + "'>" + vehicle.routeTag + "</li>");
    }
  });
});

/* Moves vehicles markers on the map when their location within the query changes */
// geoQuery.on("key_moved", function(vehicleId, vehicleLocation) {
//   //console.log("Vehicle " + vehicleId + " moved within the query.");

//   // Get the vehicle from the list of vehicles in the query
//   var vehicle = vehiclesInQuery[vehicleId];

//   // Verify state
//   console.assert(typeof vehicle !== "undefined", "Vehicle " + vehicleId + " should already be in the vehicles list.");
//   console.assert(parseInt(vehicle.id) === parseInt(vehicleId), "Vehicle " + vehicleId + " does not match the ID of vehicle " + vehicle.id + " stored in the list of vehicles in the query.");
//   console.assert(typeof vehicle.marker !== "undefined", "Vehicle " + vehicleId + " should already have a marker.");

//   // Animate the vehicle's marker
//   //vehicle.marker.animatedMoveTo(vehicleLocation);
//   var line = L.polyline([vehicle.marker.getLatLng(), vehicleLocation]);
//   vehicle.marker.setLatLng(line);
//   vehicle.marker.start();
// });

// /* Removes vehicle markers from the map when the exit the query */
// geoQuery.on("key_exited", function(vehicleId, vehicleLocation) {
//   //console.log("Vehicle " + vehicleId + " exited the query.");

//   // Get the vehicle from the list of vehicles in the query
//   var vehicle = vehiclesInQuery[vehicleId];

//   // Verify state
//   console.assert(typeof vehicle !== "undefined", "Vehicle " + vehicleId + " should already be in the vehicles list.");

//   // If the vehicle's data has already been loaded from the Open Data Set, remove its marker from the map
//   // and remove it from the location console
//   if (vehicle !== true) {
//     // Verify state
//     console.assert(parseInt(vehicle.id) === parseInt(vehicleId), "Vehicle " + vehicleId + " does not match the ID of vehicle " + vehicle.id + " stored in the list of vehicles in the query.");
//     console.assert(typeof vehicle.marker !== "undefined", "Vehicle " + vehicleId + " should already have a marker.");

//     // Remove the vehicle's marker from the map
//     vehicle.marker.setMap(null);
//     // vehicle.marker = null;

//     // Remove the vehicle from the location console
//     $("#vehicle" + vehicleId).remove();
//   }

//   // Remove the vehicle from the list of vehicles in the query
//   delete vehiclesInQuery[vehicleId];
// });

//vehicle.marker.setIcon("http://chart.googleapis.com/chart?chst=d_bubble_icon_text_small&chld=" + vehicle.vtype + "|bbT|" + vehicle.routeTag + "|BF5FFF|eee");
//vehicle.marker.setMap(null);
//vehicle.marker = createVehicleMarker(vehicle, "BF5FFF");

//vehicle.marker.setIcon("http://chart.googleapis.com/chart?chst=d_bubble_icon_text_small&chld=" + vehicle.vtype + "|bbT|" + vehicle.routeTag + "|BF5FFF|eee");

function initializeMap() {
  map = L.map("map-canvas", {
    center: center,
    zoom: 14
  });

  var layer = new L.StamenTileLayer("watercolor");
  map.addLayer(layer);

  var line = L.polyline([center, locations["Caltrain"]]);
  var animatedMarker = L.animatedMarker(line.getLatLngs(), {
    icon: L.divIcon({
      // Specify a class name we can refer to in CSS.
      className: 'vehicleMarker',
      // Define what HTML goes in each marker.
      html: "<div>JAW</div>",
      // Set a markers width and height.
      iconSize: [40, 20]
    }),
    //distance: 300,  // meters
    interval: 500, // milliseconds
    autoStart: false
  }).addTo(map);

  window.setTimeout(function() {
    animatedMarker.start()
  }, 2000);

  circle = L.circleMarker(center, {
    color: "#6D3099",
    opacity: 0.7,
    weight: 1,
    fillColor: "#B650FF",
    fillOpacity: 0.35,
    draggable: true
  }).addTo(map);
  circle.setRadius(100);
  circle.dragging.enable();

  //var draggable = new L.Draggable(circle);
  //console.log(draggable);
  //draggable.enable();

  /*circleLoc = new google.maps.LatLng(center[0], center[1]);
  var circleOptions = {
    strokeColor: "#6D3099",
    strokeOpacity: 0.7,
    strokeWeight: 1,
    fillColor: "#B650FF",
    fillOpacity: 0.35,
    map: map,
    center: circleLoc,
    radius: ((radiusInKm) * 1000),
    draggable: true
  };

  circle = new google.maps.Circle(circleOptions);

  var updateCriteria = _.debounce(function() {
    console.log("updating criteria")
    var latLng = circle.getCenter();
    geoQuery.updateCriteria({
      center: [latLng.lat(), latLng.lng()],
      radius: radiusInKm
    });
  }, 10);

  google.maps.event.addListener(circle, "drag", updateCriteria);*/
}

/**********************/
/*  HELPER FUNCTIONS  */
/**********************/
/* Adds a marker for the inputted vehicle to the map */
function createVehicleMarker(vehicle, vehicleColor) {
  var marker = new google.maps.Marker({
    icon: "http://chart.googleapis.com/chart?chst=d_bubble_icon_text_small&chld=" + vehicle.vtype + "|bbT|" + vehicle.routeTag + "|" + vehicleColor + "|eee",
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

/* Animates the Marker class (based on http://stackoverflow.com/a/10906464) */
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
    }.bind(this), 25);
  }
};
