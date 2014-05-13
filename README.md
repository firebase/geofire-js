# GeoFire — Realtime location queries with Firebase

GeoFire is a simple JavaScript library that allows you to store and query a set
of keys based on their geographic location. GeoFire uses Firebase for data
storage, allowing query results to be updated in realtime as they change.

## Downloading

In order to use GeoFire in your project, you need to include the following files in your HTML file:

```html
<!-- RSVP -->
<script src="rsvp.min.js"></script>

<!-- Firebase -->
<script src="firebase.js"></script>

<!-- GeoFire -->
<script src="geo-utils.js"></script>
<script src="geofire.js"></script>
```

You can find each of these files in the `/lib/` directory of this GitHub repository.

You can also download `rsvp.min.js` and `firebase.js` from Bower:

```bash
$ bower install rsvp
$ bower install firebase
```

We are working on making GeoFire easier to install and use in your projects and changes to this process will be coming soon. By the time version 2.0 is released, GeoFire will be available on npm and Bower.

## Example Usage

Here’s a simple example of using GeoFire:

```JavaScript
// Create a Firebase reference where GeoFire will store its information
var dataRef = new Firebase('https://my-firebase.firebaseio-demo.com'),

// Create a GeoFire index
var geoFire = new GeoFire(dataRef);

// Add a key to GeoFire
var newItem = geoFire.set(“some-unique-key”, [54.92, 21.08]);

// Create a location query for a circle with a 1 km radius
var geoQuery = geoFire.query({
  type: “circle”,
  center: [10.389, 2.412],
  radius: 1000
});

// Log the results (both initial items and new items that enter into our query)
geoQuery.onKeyEntered(function(key, location) {
  console.log(key, location);
});

// Terminate the query (we will no longer receive location updates from the server for this query)
geoQuery.cancel();
```

## API Reference

Firebase uses the lightweight [RSVP.js](https://github.com/tildeio/rsvp.js/) library to provide an implementation of JavaScript promises. If you are unfamiliar with promises, please refer to the [RSVP.js documentation](https://github.com/tildeio/rsvp.js/).

### GeoFire

A `GeoFire` instance is used to read and write to geolocation data to your Firebase. You can also use to it create `GeoQuery` objects.

#### new GeoFire(firebaseRef)

Returns a new `GeoFire` instance. The data for this `GeoFire` will be written to the provided `firebaseRef`.

#### GeoFire.set(key, location)

Returns an empty promise after the provided `key`-`location` pair has been added to Firebase.

#### GeoFire.get(key)

Returns a promise fulfilled with the location corresponding to the provided `key`.

If the `key` does not exist, the returned promise is fulfilled with `null`.

#### GeoFire.remove(key)

Returns an empty promise after the provided `key` has been removed from Firebase.

This is equivalent to calling `set(key, null)`. If the `key` does not exist, nothing happens.

#### GeoFire.query(queryCriteria)

Returns a new `GeoQuery` instance with the provide `queryCriteria`. See the `GeoQuery` documentation below for more information about what criteria can be sent.

### GeoQuery

A standing query that tracks a set of keys matching a criteria.

#### new GeoQuery(firebaseRef, queryCriteria)

Returns a new `GeoQuery` instance. The data for this `GeoQuery` will be read from the provided `firebaseRef` and the query with be described by the provided `queryCriteria`.

The `queryCriteria` must contain each of the following:

* type ("circle" or "square"
* center (latitude-longitude pair of the form [#, #])
* radius (the radius, in kilometers, of the query)

You should never need to create this directly and should only create them via `GeoFire.query(queryCriteria)`.

#### GeoQuery.updateQueryCriteria(newQueryCriteria)

Updates the query criteria for this `GeoQuery`.

#### GeoQuery.getResults()

Returns a promise fulfilled with a list of the key-location pairs which are currently within this `GeoQuery`.

The returned list will take the following form:

```JavaScript
[
  ["key1": [latitude1, longitude1],
  ...
  ["keyN": [latitudeN, longitudeN]
]
```

#### GeoQuery.onKeyEntered(callback)

Sets a callback that will fire when a `key` enters this `GeoQuery`. Returns a `GeoCallbackRegistration` which can be used to cancel the callback.

You can add as many `onKeyEntered` callbacks as you would like. Each one will get called when a `key` enters this `GeoQuery`. Each callback must be cancelled individually.

#### GeoQuery.onKeyLeft(callback)

Sets a callback that will fire when a `key` leaves this `GeoQuery`. Returns a `GeoCallbackRegistration` which can be used to cancel the callback.

You can add as many `onKeyLeft` callbacks as you would like. Each one will get called when a `key` leaves this `GeoQuery` and. Each callback must be cancelled individually.

#### GeoQuery.onKeyMoved(callback)

Sets a callback that will fire when a `key` which is already in this `GeoQuery` moves to another (or the same) location in this `GeoQuery`. Returns a `GeoCallbackRegistration` which can be used to cancel the callback.

You can add as many `onKeyMoved` callbacks as you would like. Each one will get called when a `key` which is already in this `GeoQuery` moves to another (or the same) location in this `GeoQuery`. Each callback must be cancelled individually.

#### GeoQuery.cancel()

Terminates this `GeoQuery` so that it no longer sends location updates. This `GeoQuery` can no longer be used in the future.

### GeoCallbackRegistration

A `GeoCallbackRegistration` is returned every time you call `onKey*()` on a `GeoQuery` instance. It is used to cancel callback when they are no longer needed.

#### new GeoCallbackRegistration(callback)

Returns a new `GeoCallbackRegistration` instance. The provided `callback` will be called to cancel a `GeoQuery.onKey*()` callback.

You should never need to create this directly and should only create them via `GeoQuery.onKey*(callback)`.

#### GeoCallbackRegistration.cancel()

Cancels this `GeoCallbackRegistration` so that it no longer fires its callback.

## Development

If you'd like to contribute to GeoFire, you'll need to run the following
commands to get your environment set up.

```bash
$ npm install
$ bower install
$ gulp
```

During development, you may find it useful to open tests/TestRunner.html.