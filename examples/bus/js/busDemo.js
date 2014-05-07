var map, circle;

var locations = {
  "FirebaseHQ": [37.785326, -122.405696],
  "Caltrain": [37.7789, -122.3917]
};
var center = locations["FirebaseHQ"];
var radiusInKm = 0.2;

// Get a reference to the SF Muni public transit data
var muniFirebaseRef = new Firebase("https://publicdata-transit.firebaseio.com/sf-muni/data");

// For the search
var demoFirebaseRef = new Firebase("https://geoFireBus.firebaseio-demo.com/");
demoFirebaseRef.remove(function() {
  console.log("***  Firebase reset  ***");
  var geoFire = new GeoFire(demoFirebaseRef);

  // Create a geo query
  var geoQuery = geoFire.query({
    type: "circle",
    center: center,
    radius: radiusInKm
  });

  var vehicles = {};

  // Every time a new data point is added to the SF Muni public transit data, create a new vehicle marker and add it to geoFir
  muniFirebaseRef.on("child_added", function(snapshot) {
    console.log("child_added");
    // Get the vehicle data stored in Firebase
    var vehicle = snapshot.val();

    // Create the vehicle marker
    vehicle.marker = createVehicleMarker(vehicle, getVehicleColor(vehicle));

    // Store the vehicle for later
    vehicles[vehicle.id] = vehicle;

    // Add the current vehicle to geoFire
    geoFire.set(vehicle.id.toString(), [vehicle.lat, vehicle.lon]).then().catch(function(error) {
      console.error("Error in GeoFire.set(): " + error);
    });
  });

  muniFirebaseRef.on("child_changed", function(snapshot) {
    console.log("child_changed");

    var vehicle = snapshot.val();

    console.assert(vehicles[vehicle.id], "Vehicle " + vehicle.id + " (" + vehicle.routeTag + ") is not in the vehicles list.");

    vehicle.marker = vehicles[vehicle.id].marker;
    vehicles[vehicle.id] = vehicle;

    if (vehicle.marker) {
      vehicle.marker.animatedMoveTo(vehicle.lat, vehicle.lon);
    }
    else {
      console.log("new vehicle from child_changed");
      vehicle.marker = createVehicleMarker(vehicle, getVehicleColor(vehicle));
    }

    geoFire.set(vehicle.id.toString(), [vehicle.lat, vehicle.lon]).then().catch(function(error) {
      console.error("Error in GeoFire.set(): " + error);
    });
  });

  muniFirebaseRef.on("child_removed", function(snapshot) {
    console.log("child_removed");

    var vehicle = snapshot.val();

    console.assert(vehicles[vehicle.id], "Vehicle " + vehicle.id + " (" + vehicle.routeTag + ") is not in the vehicles list.");

    vehicle.marker = vehicles[vehicle.id].marker;

    if (vehicle.marker) {
      vehicle.marker.setMap(null);
      delete vehicles[vehicle.id];

      geoFire.remove(vehicle.id.toString()).then().catch(function(error) {
        console.error("Error in GeoFire.remove(): " + error);
      });
    }
  });

  geoQuery.onKeyEntered(function(vehicleId, vehicleLocation) {
    var vehicle = vehicles[vehicleId];

    console.assert(vehicles[vehicle.id], "Vehicle " + vehicle.id + " (" + vehicle.routeTag + ") is not in the vehicles list.");
    console.log("onKeyEntered(): " + vehicleId + " (" + vehicle.routeTag + ")");

    vehicle.marker.setIcon("http://chart.googleapis.com/chart?chst=d_bubble_icon_text_small&chld=" + vehicle.vtype + "|bbT|" + vehicle.routeTag + "|BF5FFF|eee");
    //vehicle.marker.setMap(null);
    //vehicle.marker = createVehicleMarker(vehicle, "BF5FFF");

    $("#location-console ul").append("<li id='vehicle" + vehicleId + "'>" + vehicle.routeTag + "</li>");
  });

  geoQuery.onKeyMoved(function(vehicleId, vehicleLocation) {
    var vehicle = vehicles[vehicleId];

    console.assert(vehicles[vehicle.id], "Vehicle " + vehicle.id + " (" + vehicle.routeTag + ") is not in the vehicles list.");
    console.log("onKeyMoved(): " + vehicleId + " (" + vehicle.routeTag + ")");

    //vehicle.marker.setIcon("http://chart.googleapis.com/chart?chst=d_bubble_icon_text_small&chld=" + vehicle.vtype + "|bbT|" + vehicle.routeTag + "|BF5FFF|eee");
  });

  geoQuery.onKeyLeft(function(vehicleId, vehicleLocation) {
    var vehicle = vehicles[vehicleId];

    console.assert(vehicles[vehicle.id], "Vehicle " + vehicle.id + " (" + vehicle.routeTag + ") is not in the vehicles list.");
    console.log("onKeyLeft(): " + vehicleId + " (" + vehicle.routeTag + ")");

    vehicle.marker.setIcon("http://chart.googleapis.com/chart?chst=d_bubble_icon_text_small&chld=" + vehicle.vtype + "|bbT|" + vehicle.routeTag + "|" + getVehicleColor(vehicle) + "|eee");
    //vehicle.marker.setMap(null);
    //vehicle.marker = createVehicleMarker(vehicle, getVehicleColor(vehicle));

    $("#vehicle" + vehicleId).remove();
  });
});

function initializeMap() {
  loc = new google.maps.LatLng(center[0], center[1]);
  var mapOptions = {
    center: loc,
    zoom: 15,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

  circleLoc = new google.maps.LatLng(center[0], center[1]);
  var circleOptions = {
    strokeColor: "#6D3099",
    strokeOpacity: 0.7,
    strokeWeight: 1,
    fillColor: "#B650FF",
    fillOpacity: 0.35,
    map: map,
    center: circleLoc,
    radius: ((radiusInKm) * 1000)
  };

  circle = new google.maps.Circle(circleOptions);
}

/**********************/
/*  HELPER FUNCTIONS  */
/**********************/
/* Adds a marker for the inputted vehicle to the map */
function createVehicleMarker(vehicle, vehicleColor) {
  var marker = new google.maps.Marker({
    icon: "http://chart.googleapis.com/chart?chst=d_bubble_icon_text_small&chld=" + vehicle.vtype + "|bbT|" + vehicle.routeTag + "|" + vehicleColor + "|eee",
    position: new google.maps.LatLng(vehicle.lat, vehicle.lon),
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
google.maps.Marker.prototype.animatedMoveTo = function(toLat, toLng) {
  var fromLat = this.getPosition().lat();
  var fromLng = this.getPosition().lng();

  if (!coordinatesAreEquivalent(fromLat, toLat) || !coordinatesAreEquivalent(fromLng, toLng)) {
    // Store a LatLng for each step of the animation
    var frames = [];
    for (var percent = 0; percent < 1; percent += 0.01) {
      curLat = fromLat + percent * (toLat - fromLat);
      curLng = fromLng + percent * (toLng - fromLng);
      frames.push(new google.maps.LatLng(curLat, curLng));
    }

    move = function(marker, latlngs, numLatlngs, index, wait) {
      marker.setPosition(latlngs[index]);
      if (index != numLatlngs - 1) {
        // Call the next "frame" of the animation
        setTimeout(function() {
          move(marker, latlngs, numLatlngs, index + 1, wait);
        }, wait);
      }
    };

    // Begin animation
    move(this, frames, frames.length, 0, 25);
  }
};
