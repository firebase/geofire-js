var cars = {},
    map, circle;

// For creating the map markers
var moveRef = new Firebase("https://munigeo.firebaseio.com/sf-muni/data");
var geoRef = new Firebase("https://munigeo.firebaseio.com/sf-muni/geo/geoFire");
var hashRef = geoRef.child("/dataByHash");
var idRef = geoRef.child("/dataById");

// For the search
var geo = new geoFire(new Firebase("https://munigeo.firebaseio.com/sf-muni/geo"));
var center = [37.7789, -122.3917];
var src = [37.785326, -122.402696];
var radiusInKm = 0.5;

// UI Elements
var $console = $('#location-console');
var $consoleList = $('#location-console ul');

function initialize() {
    loc = new google.maps.LatLng(center[0], center[1]);
    var mapOptions = {
        center: loc,
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    map = new google.maps.Map(document.getElementById("map-canvas"),
                              mapOptions);

    circleLoc = new google.maps.LatLng(src[0], src[1]);
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

moveRef.once("value", function(snapshot) {
        snapshot.forEach(function(car) {
                createCar(car.val(), car.name());
            });
    });

moveRef.on("child_changed", function(snapshot) {
        var marker = cars[snapshot.name()];
        if (typeof marker === 'undefined') {
            createCar(snapshot.val(), snapshot.name());
        }
        else {
            //var loc = geoFire.decode(snapshot.val().geohash);
            //marker.animatedMoveTo(loc[0], loc[1]);
            marker.animatedMoveTo(snapshot.val().lat, snapshot.val().lon);
        }
    });

moveRef.on("child_removed", function(snapshot) {
        var marker = cars[snapshot.name()];
        if (typeof marker !== 'undefined') {
            marker.setMap(null);
            delete cars[snapshot.name()];
        }
    });

geo.onPointsNearLoc(src, radiusInKm, function(allBuses) {
    if(allBuses.length > 0) {
        $consoleList.html('');
        $console.removeClass('hidden').addClass('bounceInUp');
        var buses = [];

        _.map(allBuses, function(bus) {
            buses.push(bus.routeTag);
        });

        var uniqueBuses = _.unique(buses);

        // Loop through and add coordinates
        _.each(uniqueBuses, function(bus){
            $consoleList.append('<li>' + bus + '</li>');
        });
    }
    });

function createCar(car, firebaseId) {
    var latLon = new google.maps.LatLng(car.lat, car.lon);
    var dirColor = car.dirTag && car.dirTag.indexOf('OB') > -1 ? "50B1FF" : "FF6450";
    var iconType = 'bus'; // 'train' looks nearly identical to bus at rendered size
    var marker = new google.maps.Marker({ icon: 'http://chart.googleapis.com/chart?chst=d_bubble_icon_text_small&chld=' + iconType + '|bbT|'+ car.routeTag+'|' + dirColor + '|eee',
                                          position: latLon,
                                          map: map });
    cars[firebaseId] = marker;
}

/* Helper functions */
function randomString(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for(var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function feq (f1, f2) {
    return (Math.abs(f1 - f2) < 0.000001);
}

// Vikrum's hack to animate/move the Marker class
// based on http://stackoverflow.com/a/10906464
google.maps.Marker.prototype.animatedMoveTo = function(toLat, toLng) {
    var fromLat = this.getPosition().lat();
    var fromLng = this.getPosition().lng();

    if(feq(fromLat, toLat) && feq(fromLng, toLng))
        return;

    // store a LatLng for each step of the animation
    var frames = [];
    for (var percent = 0; percent < 1; percent += 0.005) {
        curLat = fromLat + percent * (toLat - fromLat);
        curLng = fromLng + percent * (toLng - fromLng);
        frames.push(new google.maps.LatLng(curLat, curLng));
    }

    move = function(marker, latlngs, index, wait) {
        marker.setPosition(latlngs[index]);
        if(index != latlngs.length-1) {
            // call the next "frame" of the animation
            setTimeout(function() {
                    move(marker, latlngs, index+1, wait);
                }, wait);
        }
    };

    // begin animation, send back to origin after completion
    move(this, frames, 0, 25);
};
