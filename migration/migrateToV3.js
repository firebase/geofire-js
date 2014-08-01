var Firebase = require('firebase');
var RSVP = require('rsvp');
var args = process.argv

function usage() {
  console.log("USAGE: " + args[0] + " " + args[1] + " [--firebase-secret <firebase-secret>] --in-place <geofire-reference> ");
  console.log("       " + args[0] + " " + args[1] + " [--firebase-secret <firebase-secret>] <old-reference> <new-reference>")
  console.log("WARNING: --in-place deletes old references");
  console.log("The Firebase secret is optional. By passing the secret you can override any security rules present");
  process.exit(1);
}

function setWithPromise(ref, value, priority) {
  return new RSVP.Promise(function(resolve, reject) {
    if (priority) {
      ref.setWithPriority(value, priority, function(error) {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    } else {
      ref.set(value, function(error) {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    }
  });
}

function runMigration(fromFirebase, toFirebase, inPlace) {
  console.log("Loading old data...");

  fromFirebase.child('i').once('value', function(snapshot) {
    console.log('Received old data, processing (this may take a while)...');
    var error = false;
    var promises = [];
    if (snapshot.val() === null) {
      console.log("Not a valid GeoFire v2 reference: " + fromFirebase);
      process.exit(1);
    } else {
      snapshot.forEach(function(child) {
        var parts = child.name().split(":");
        if (parts.length < 2) {
          console.log("Error transcribing key " + hashKeyPair + "! Not a valid GeoFire entry!");
          error = true;
        } else {
          var hash = parts[0];
          var key = parts.splice(1).join(":");
          (function(key, hash) {
            var promise = new RSVP.Promise(function(resolve, reject) {
              fromFirebase.child('l').child(key).once('value', function(snapshot) {
                resolve(snapshot.val());
              }, function(error) {
                reject(error);
              });
            }).then(function(value) {
              if (value != null) {
                var lat = value[0];
                var lng = value[1];
                if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
                  console.log("Error transcribing key " + key + "! Not a valid geolocation: [" + lat + ", " + lng + "]");
                  error = true;
                } else {
                  return new setWithPromise(toFirebase.child(key), { "g": hash, "l": [lat, lng] }, hash);
                }
              } else {
                console.log("Key was removed from GeoFire while migrating: " + key);
              }
            });
            promises.push(promise);
          })(key, hash);
        }
      });
      RSVP.all(promises).then(function(posts) {
        if (error) {
          console.log("There were errors migrating GeoFire, please check your data and the result manually");
          process.exit(1);
        } else {
          console.log("Migrated " + promises.length + " keys successfully!");
          if (inPlace) {
            console.log("Deleting old keys");
            return RSVP.all([
              setWithPromise(fromFirebase.child('l'), null),
              setWithPromise(fromFirebase.child('i'), null),
            ]);
          }
        }
      }).then(function() {
        console.log("All done...");
        process.exit(0);
      }).catch(function(reason) {
        console.log("There was an error running the migration: " + reason);
        process.exit(1);
      });
    }
  }, function(error) {
    console.log("There was an error getting the old GeoFire data: " + error);
  });
}

/***** Parse Arguments ******/
var progArgs = args.slice(2);

var secretIndex = progArgs.indexOf("--firebase-secret");
var firebaseSecret;
if (secretIndex !== -1) {
  firebaseSecret = progArgs[secretIndex+1];
  progArgs.splice(secretIndex, 2);
} else {
  firebaseSecret == null;
}

if (progArgs.length !== 2) {
  usage();
}

var inPlace;
var fromFirebase;
var toFirebase;
if (progArgs[0] === "--in-place") {
  inPlace = true;
  fromFirebase = new Firebase(progArgs[1]);
  toFirebase = new Firebase(progArgs[1]);
} else {
  inPlace = false;
  fromFirebase = new Firebase(progArgs[0]);
  toFirebase = new Firebase(progArgs[1]);
}

if (firebaseSecret) {
  console.log("Authenticating...");
  toFirebase.auth(firebaseSecret, function() {
    //success
    console.log("Authentication successful.");
    runMigration(fromFirebase, toFirebase, inPlace);
  }, function() {
    //failure
    console.log("Error authenticating...");
    process.exit(1);
  });
} else {
  runMigration(fromFirebase, toFirebase, inPlace);
}

