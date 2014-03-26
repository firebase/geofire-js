GeoFire — Realtime location queries with Firebase
==========

GeoFire is a simple javascript library that allows you to store and
query a set of keys based on location. GeoFire uses Firebase for
data storage, allowing query results to be updated in realtime as they change.

Here’s a simple example of using GeoFire:

    //Create a reference where GeoFire will store its index information
    var dataRef = new Firebase('https://my-firebase.firebaseio-demo.com'),

    //Create a GeoFire index
    var geo = new GeoFire(geoRef);

    //Write a key into the index
    var newItem = geo.set(“some-unique-key”, [1, 2]);

    //Create a location query for a circle with a 1 km radius from the center of San Francisco.
    var q = geo.query({type: “circle”, center: [1, 2], radius: 1000});

    //Print the results — both initial items and new items that enter into our search area
    q.onKeyEntered(function(key, location) {
      console.log(key, location);
    });

    //Terminate the query, so we are no longer sent location updates for this query from the server.
    q.cancel();

var geo = new GeoFire(ref);
var promise = geo.set(key, location);
var promise = geo.get(key);

var query = geo.query(criteria);
var registration = query.onKeyEntered(callback(key, location));
var registration = query.onKeyLeft(callback(key));
var promise = query.then();
var promise = query.updateQueryCriteria(criteria);
query.cancel();

registration.cancel();

Objects:
GeoFire
Query
Promise
Registration

Development
====

```bash
npm install
bower install
grunt test
grunt
```
