var map, circle;
var geoQuery;

var locations = {
  "FirebaseHQ": [37.785326, -122.405696],
  "Caltrain": [37.7789, -122.3917]
};
var center = locations["FirebaseHQ"];
var radiusInKm = 0.75;

// Get a reference to the SF Muni public transit data
var muniFirebaseRef = new Firebase("https://publicdata-transit.firebaseio.com/sf-muni/data");
//var muniFirebaseRef = new Firebase("https://busRoutes.firebaseio-demo.com/sf-muni/");

// For the search
var demoFirebaseRef = new Firebase("https://geoFireBus.firebaseio-demo.com/");
demoFirebaseRef.remove(function() {
  console.log("***  Firebase reset  ***");
  var geoFire = new GeoFire(demoFirebaseRef);

  // Create a geo query
  geoQuery = geoFire.query({
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
    //vehicle.marker = createVehicleMarker(vehicle, getVehicleColor(vehicle));

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

    if (vehicles[vehicle.id].marker) {
      vehicle.marker = vehicles[vehicle.id].marker;
    }
    vehicles[vehicle.id] = vehicle;

    /*if (vehicle.marker) {
      vehicle.marker.animatedMoveTo(vehicle.lat, vehicle.lon);
    }
    else {
      console.log("new vehicle from child_changed");
      vehicle.marker = createVehicleMarker(vehicle, getVehicleColor(vehicle));
    }*/

    geoFire.set(vehicle.id.toString(), [vehicle.lat, vehicle.lon]).then().catch(function(error) {
      console.error("Error in GeoFire.set(): " + error);
    });
  });

  muniFirebaseRef.on("child_removed", function(snapshot) {
    console.log("child_removed: " + snapshot.val().id);

    var vehicle = snapshot.val();

    console.assert(vehicles[vehicle.id], "Vehicle " + vehicle.id + " (" + vehicle.routeTag + ") is not in the vehicles list.");

    geoFire.remove(vehicle.id.toString()).then(function() {
      vehicle.marker = null;
      delete vehicles[vehicle.id];
    }).catch(function(error) {
      console.error("Error in GeoFire.remove(): " + error);
    });



    //vehicle.marker = vehicles[vehicle.id].marker;

    /*if (vehicle.marker) {
      vehicle.marker.setMap(null);
      delete vehicles[vehicle.id];

      geoFire.remove(vehicle.id.toString()).then().catch(function(error) {
        console.error("Error in GeoFire.remove(): " + error);
      });
    }*/
  });

  geoQuery.on("key_entered", function(vehicleId, vehicleLocation, distance) {
    var vehicle = vehicles[vehicleId];

    console.assert(vehicle, "Vehicle " + vehicleId + " is not in the vehicles list.");
    //console.log("onKeyEntered(): " + vehicleId + " (" + vehicle.routeTag + ")");

    vehicle.marker = createVehicleMarker(vehicle, getVehicleColor(vehicle));

    vehicles[vehicleId] = vehicle;

    //vehicle.marker.setIcon("http://chart.googleapis.com/chart?chst=d_bubble_icon_text_small&chld=" + vehicle.vtype + "|bbT|" + vehicle.routeTag + "|BF5FFF|eee");
    //vehicle.marker.setMap(null);
    //vehicle.marker = createVehicleMarker(vehicle, "BF5FFF");

    $("#location-console ul").append("<li id='vehicle" + vehicleId + "'>" + vehicle.routeTag + "</li>");
  });

  geoQuery.on("key_moved", function(vehicleId, vehicleLocation, distance) {
    var vehicle = vehicles[vehicleId];

    console.assert(vehicle, "Vehicle " + vehicleId + " is not in the vehicles list.");
    //console.log("onKeyMoved(): " + vehicleId + " (" + vehicle.routeTag + ")");

    //vehicle.marker.setIcon("http://chart.googleapis.com/chart?chst=d_bubble_icon_text_small&chld=" + vehicle.vtype + "|bbT|" + vehicle.routeTag + "|BF5FFF|eee");

    vehicle.marker.animatedMoveTo(vehicleLocation[0], vehicleLocation[1]);
  });

  geoQuery.on("key_left", function(vehicleId, vehicleLocation, distance) {
    var vehicle = vehicles[vehicleId];

    console.assert(vehicle, "Vehicle " + vehicleId + " is not in the vehicles list.");
    //console.log("onKeyLeft(): " + vehicleId + " (" + vehicle.routeTag + ")");

    //vehicle.marker.setIcon("http://chart.googleapis.com/chart?chst=d_bubble_icon_text_small&chld=" + vehicle.vtype + "|bbT|" + vehicle.routeTag + "|" + getVehicleColor(vehicle) + "|eee");
    //vehicle.marker.setMap(null);
    //vehicle.marker = createVehicleMarker(vehicle, getVehicleColor(vehicle));
    vehicle.marker.setMap(null);


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
    radius: ((radiusInKm) * 1000),
    draggable: true
  };

  circle = new google.maps.Circle(circleOptions);

  google.maps.event.addListener(circle, "drag", function (event) {
    var latLng = circle.getCenter();

    geoQuery.updateQueryCriteria({
      center: [latLng.lat(), latLng.lng()],
      radius: radiusInKm
    });
  });
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
google.maps.Marker.prototype.animatedMoveTo = function(toLat, toLng) {
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
