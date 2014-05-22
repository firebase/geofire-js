# GeoFire — Realtime location queries with Firebase

GeoFire is a JavaScript library that allows you to store and query a set
of keys based on their geographic location. GeoFire uses Firebase for data
storage, allowing query results to be updated in realtime as they change.

## Downloading

In order to use GeoFire in your project, you need to include the following files in your HTML file:

```html
<!-- RSVP -->
<script src="rsvp.min.js"></script>

<!-- Firebase -->
<script src="firebase.min.js"></script>

<!-- GeoFire -->
<script src="GeoFire.min.js"></script>
```

You can find each of these files in the `/dest/` directory of this GitHub repository. For debugging purposes, there is also non-minified `GeoFire.js` file in the `/dest/` directory.

You can also download all of these files via Bower [__Note__: GeoFire is currently not available via bower]:

```bash
$ bower install rsvp firebase [geofire]
```

By the time GeoFire version 2.0 is officially released, it will be available via both npm and Bower.

## Example Usage

```JavaScript
// Create a Firebase reference where GeoFire will store its information
var dataRef = new Firebase("https://my-firebase.firebaseio-demo.com");

// Create a GeoFire index
var geoFire = new GeoFire(dataRef);

// Add a key to GeoFire
geoFire.set("some-unique-key", [37.785326, -122.405696]).then(function() {
  // Do something after the location has been written to GeoFire
});

// Create a location query for a circle with a 10 km radius
var geoQuery = geoFire.query({
  type: "circle",
  center: [10.389, 2.412],
  radius: 10
});

// Get the keys currently in the query
geoQuery.getResults().then(function(results) {
  results.forEach(function(result) {
    console.log(result.key + " currently in query at " + result.location);
  });
});

// Log the results (both initial items and new items that enter into the query)
geoQuery.on("key_entered", function(key, location) {
  console.log(key + " entered query at " + location);
});

// Terminate the query (we will no longer receive location updates from the server for this query)
geoQuery.cancel();
```

## Promises

As can be seen in the example usage above, GeoFire uses promises when writing and retrieving data. It uses the lightweight [RSVP.js](https://github.com/tildeio/rsvp.js/) library to provide an implementation of JavaScript promises. If you are unfamiliar with promises, please refer to the [RSVP.js documentation](https://github.com/tildeio/rsvp.js/).

## API Reference

### GeoFire

A `GeoFire` instance is used to read and write geolocation data to your Firebase. You can also use to it create `GeoQuery` objects.

#### new GeoFire(firebaseRef)

Returns a new `GeoFire` instance. The data for this `GeoFire` will be written to the provided `firebaseRef`. Note that this `firebaseRef` can point to anywhere in your Firebase and does not have to live off of the root node.

#### GeoFire.set(key, location)

Returns an empty promise after the provided `key` - `location` pair has been added to Firebase

`location` should have the form [`latitude`, `longitude`].

`key` must be a string or a number.

```JavaScript
geoFire.set("some-unique-key", [37.785326, -122.405696]).then(function() {
  alert("Location has been added to GeoFire");
}, function(error) {
  // Handle error case
});
```

#### GeoFire.get(key)

Returns a promise fulfilled with the location corresponding to the provided `key`.

If the `key` does not exist, the returned promise is fulfilled with `null`.

```JavaScript
geoFire.get("some-unique-key").then(function(location) {
  alert("Provided key has a location of " + location);
}. function(error) {
  // Handle error case
});
```

#### GeoFire.remove(key)

Returns an empty promise after the provided `key` has been removed from Firebase. This is equivalent to calling `set(key, null)`.

If the `key` does not exist, nothing happens, but the promise will still be resolved.

```JavaScript
geoFire.remove("some-unique-key").then(function() {
  alert("Location has been removed from GeoFire");
}, function(error) {
  // Handle error case
});
```

#### GeoFire.query(queryCriteria)

Returns a new `GeoQuery` instance with the provide `queryCriteria`.

The `queryCriteria` must contain each of the following:

* type ("circle" or "square" [__Note__: "square" is currently not implemented])
* center (location with the form [`latitude`, `longitude`])
* radius (the radius, in kilometers, of the query; can have a decimal value)

```JavaScript
var geoQuery = geoFire.query({
  type: "circle",
  center: [10.389, 2.412],
  radius: 10
});
```

### GeoQuery

A standing query that tracks a set of keys matching a criteria.

#### GeoQuery.updateQueryCriteria(newQueryCriteria)

Updates the query criteria for this `GeoQuery`.

`newQueryCriteria` must contain a `type`, `center`, and `radius`.

#### GeoQuery.getResults()

Returns a promise fulfilled with a list of dictionaries containing the `key` - `location` pairs which are currently within this `GeoQuery`.

The returned list will have the following form:

```JavaScript
[
  { key: "key1", location: [latitude1, longitude1] },
  ...
  { key: "keyN", location: [latitudeN, longitudeN] }
]
```

```JavaScript
geoQuery.getResults().then(function(results) {
  results.forEach(function(result) {
    console.log(result.key + " currently in query at " + result.location);
  });
}, function(error) {
  // Handle error case
});
```

#### GeoQuery.on(eventType, callback)

Attaches a `callback` to this `GeoQuery` for a given `eventType`. The `callback` will be passed two parameters, the location's `key` and the location's [`latitude`, `longitude`] pair.

Returns a `GeoCallbackRegistration` which can be used to cancel the `callback`. You can add as many callbacks as you would like by calling `on()` multiple times. Each one will get called when its corresponding `eventType` fires. Each `callback` must be cancelled individually.

Valid `eventType` values are `key_entered`, `key_left`, and `key_moved`.

`key_entered` is fired when a `key` enters this `GeoQuery`. This can happen when a `key` moves from a location outside of this `GeoQuery` to one inside of it or when a `key` is written to `GeoFire` for the first time and it falls within this `GeoQuery`.

`key_left` is fired when a `key` moves from a location inside of this `GeoQuery` to one outside of it.

`key_moved` is fired when a `key` which is already in this `GeoQuery` moves to another (or the same) location inside of it.

```JavaScript
var onKeyEnteredRegistration = geoQuery.on("key_entered", function(key, location) {
  console.log(key + " entered query at " + location);
});

var onKeyMovedRegistration = geoQuery.on("key_moved", function(key, location) {
  console.log(key + " moved within query to " + location);
});

var onKeyLeftRegistration = geoQuery.on("key_left", function(key, location) {
  console.log(key + " left query to " + location);
});
```

#### GeoQuery.cancel()

Terminates this `GeoQuery` so that it no longer sends location updates. This `GeoQuery` can no longer be used in the future.

```JavaScript
var geoQuery = geoFire.query({
  type: "circle",
  center: [10.389, 2.412],
  radius: 10
});

geoQuery.cancel();
```

### GeoCallbackRegistration

A `GeoCallbackRegistration` is returned every time you call `on()` on a `GeoQuery` instance. It is used to cancel a callback when it is no longer needed.

#### GeoCallbackRegistration.cancel()

Cancels this `GeoCallbackRegistration` so that it no longer fires its callback.

```JavaScript
// This example stops listening for new keys entering the query once the
// first key leaves the query

var onKeyEnteredRegistration = geoQuery.on("key_entered", function(key, location) {
  console.log(key + " entered query at " + location);
});

var onKeyLeftRegistration = geoQuery.on("key_left", function(key, location) {
  console.log(key + " left query to " + location);
  onKeyEnteredRegistration.cancel();
});
```

## Contributing

If you'd like to contribute to GeoFire, you'll need to run the following
commands to get your environment set up.

```bash
$ git clone https://github.com/firebase/GeoFire.git
$ npm install    # install local npm build /test dependencies
$ bower install  # install local JavaScript dependencies
$ gulp serve     # watch for file changes and start server
```

`gulp serve` will watch for changes in the `/src/` directory and lint, concatenate, and minify the source files when a change occurs. It also starts a server running GeoFire at `http://localhost:6060`.

During development, you can run the test suite by navigating to `http://localhost:6060/tests/TestRunner.html` or run the tests via the command line using `gulp test`.