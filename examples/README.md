# Examples | GeoFire

GeoFire is an open-source library that allows you to store and query a set of keys based on their
geographic location. At its heart, GeoFire simply stores locations with string keys. Its main
benefit, however, is the possibility of retrieving only those keys within a given geographic
area - all in realtime.

GeoFire uses the [Firebase Realtime Database](https://firebase.google.com/docs/database/) for data
storage, allowing query results to be updated in realtime as they change. GeoFire *selectively loads
only the data near certain locations, keeping your applications light and responsive*, even with
extremely large datasets.

A compatible GeoFire client is also available for [Objective-C](https://github.com/firebase/geofire-objc)
and [Java](https://github.com/firebase/geofire-java).

## Running Locally

To run the following examples locally, clone this entire `geofire` repository
and then simply open each example's respective `index.html` file in the browser
of your choice.

## [fish1 - Writing To and Reading From GeoFire](fish1/)

This is a very basic example which shows you how to read from and write to GeoFire
and how to handle the promises returned by the `set()`, `get()`, and `remove()`
methods.

You can check out a live demo of this example [here](https://geofire.firebaseapp.com/fish1/index.html).

## [fish2 - Using a GeoQuery](fish2/)

This is a more complex example which shows you how to create a `GeoQuery` and
respond to keys moving into, out of, and within the query. It also shows how
to cancel event callback registrations.

You can check out a live demo of this example [here](https://geofire.firebaseapp.com/fish2/index.html).

## [fish3 - Loading Initial Data](fish3/)

This example shows you how to achieve a common use case: loading only initial
data. This is accomplished in GeoFire by canceling a `GeoQuery` once its `ready`
event has fired.

You can check out a live demo of this example [here](https://geofire.firebaseapp.com/fish3/index.html).

## [html5Geolocation - HTML5 Geolocation API](html5Geolocation/)

The [HTML5 Geolocation API](http://diveintohtml5.info/geolocation.html) allows you
to get the current location of the person who is viewing your site. This demo shows
how to use it to add their location to GeoFire. In addition, the examples uses
Firebase's `onDisconnect()` method to remove their location from GeoFire when they
leave the page (or close the app).

You can check out a live demo of this example [here](https://geofire.firebaseapp.com/html5Geolocation/index.html).

## [queryBuilder - Build a Custom GeoQuery](queryBuilder/)

This demo allows you to build custom `GeoQuery` objects and see when fish enter and
leave the query as it gets updated. Thanks to [@stefek99](https://github.com/stefek99)
for the contribution!

You can check out a live demo of this example [here](https://geofire.firebaseapp.com/queryBuilder/index.html).

## [securityRules - Security Rules](securityRules/)

It is important to protect your data with [Firebase and Security Rules](https://firebase.google.com/docs/database/security/).
This example contains several different versions of rules for your GeoFire index. All of the
following rules enforce the schema of your index, but allow varying types of updates to it.

* **[Default rules](https://geofire.firebaseapp.com/securityRules/rules.json)** - These rules allow
any client to add, update, or remove items from your index. This does not prevent a malicious user
from overwriting your index.

* **[Authenticated rules](https://geofire.firebaseapp.com/securityRules/authenticated.rules.json)** -
These rules require that only authenticated clients can update your index. Note that these rules
will intentionally cause all `GeoFire.add()` and `GeoFire.remove()` calls to fail for unauthenticated
clients.

* **[No deletes rules](https://geofire.firebaseapp.com/securityRules/noDeletes.rules.json)** - These
rules prevent clients from being able to delete any existing keys in your index. Note that these
rules will intentionally cause all `GeoFire.remove()` calls to fail.

* **[No updates rules](https://geofire.firebaseapp.com/securityRules/noUpdates.rules.json)** - These
rules prevent clients from being able to update or delete any existing keys in your index. Note that
these rules will intentionally fail all `GeoFire.remove()` calls as well as any `GeoFire.add()`
calls for existing keys in the index.

You can further replace the `".write"` rule in the example rules files with some custom logic to
restrict who and how users can write to your GeoFire index.

All of the example rules ensure that one client cannot overwrite your entire GeoFire index node with
a single call. However, none of them prevent a malicious user from scraping your entire index. You
can replace the `".read"` rule in the example rules files with some custom logic to do this.
