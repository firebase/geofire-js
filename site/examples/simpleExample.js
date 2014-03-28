var geoFire = require('../geoFire.js'),
    Firebase = require('Firebase');
var cb = function(error) {};

// geoFire needs a Firebase reference to store location data to Firebase
var refName = 'https://'+randomString(10)+'.firebaseio-demo.com/example';
var geoRef = new Firebase(refName);
    geo = new geoFire(geoRef);
console.log("example.js Firebase data link:", refName);

// Create four fish, save their locations using geoFire
var fishList = [new Fish(1, "Salmon", "Pink"),
                new Fish(2, "Rainbow", "White"),
                new Fish(3, "Chocolate", "Red"),
                new Fish(4, "Goldfish", "Green")];

var locList = [[-16.130262, 153.605347], // Coral Sea
               [-66.722541, -167.019653], // Southern Ocean
               [-41.112469, 159.054565], // Tasman Sea
               [30.902225, -166.66809]]; // North Pacific Ocean
               
for (var i = 0; i < fishList.length; i++) {
    var cb = (fishList[i].id === 3) ? (function(error) { if (!error) search(); }) : (function(error) {});
    geo.insertByLocWithId(locList[i], fishList[i].id, fishList[i], cb);
}

// Print all fish within 5000 km of fish3;                                                                                                                                                          
// do this everytime the set of fish changes.                                                                                                                                                       
function search() {
    geo.onPointsNearId(3, 5000, myfish);
    update();
}

function myfish(fish) {
    console.log("Search completed:");
    
    if ((fish === null) ||
        ((fish.length === 1) && (fish[0]['id'] === 3))) {
        console.log("No fish found");
    } else {
        for (var i = 0; i < fish.length; i++)
            if (fish[i]['id'] !== 3)
                console.log("Fish ", fish[i]['id']);
    }
}

// Fish1 migrates OUT of the search region, Fish2 migrates INTO it.
// The Search results must update accordingly.
var dest = [53.435719,-40.808716]; // North Atlantic Ocean                                                                                                                                                
function update() {
    setTimeout(function() {
            console.log("\n\n**Fish 1 migrates out of the search region**\n\n");
            geo.updateLocForId(dest, 1, function() {
                    console.log("\n\n**Fish 2 migrates into the search region**\n\n");
                    geo.updateLocForId(locList[0], 2, off);
                });
        }, 5000);
}

function off() {
    geo.offPointsNearId(3, 5000, myfish);
    update();
}

function Fish(id, type, color) {
    this.id = id;
    this.type = type;
    this.color = color;
}

function randomString(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for(var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}
