# GeoFire Examples

GeoFire is an open-source JavaScript library that allows you to store and query a set
of items based on their geographic location. GeoFire uses [Firebase](https://www.firebase.com/) for data
storage, allowing query results to be updated in realtime as they change.
GeoFire does more than just measure the distance between locations; it
selectively loads only the data near certain locations, keeping your
applications light and responsive even with extremely large datasets.

## Running Locally

To run the following examples locally, clone this entire `geofire` repository
and then simply open the example's respective `index.html` file in the browser
of your choice.

## [fish1 - Writing To and Reading From GeoFire](https://geofire.firebaseapp.com/fish1/index.html)

This is a very basic example which shows you how to read from and write to GeoFire
and how to handle the promises returned by the `set()`, `get()`, and `remove()`
methods.

You can check out a live demo of this example [here](https://geofire.firebaseapp.com/fish1/index.html).

## [fish2 - Using a GeoQuery](https://geofire.firebaseapp.com/fish3/index.html)

This is a more complex example which shows you how to create a `GeoQuery` and
respond to keys moving into, out of, and within the query. It also shows how
to cancel event callback registrations.

You can check out a live demo of this example [here](https://geofire.firebaseapp.com/fish2/index.html).

## [fish3 - Loading Initial Data](https://geofire.firebaseapp.com/fish3/index.html)

This example shows you how to achieve a common use case: loading only initial
data. This is accomplished in GeoFire by canceling a `GeoQuery` once its `ready`
event has fired.

You can check out a live demo of this example [here](https://geofire.firebaseapp.com/fish3/index.html).

## [html5Geolocation - HTML5 Geolocation API](https://geofire.firebaseapp.com/html5Geolocation/index.html)

The [HTML5 Geolocation API](http://diveintohtml5.info/geolocation.html) allows you
to get the current location of the person who is viewing your site. This demo shows
how to use it to add their location to GeoFire. In addition, the examples uses
Firebase's `onDisconnect()` method to remove their location from GeoFire when they
leave the page (or close the app).

You can check out a live demo of this example [here](https://geofire.firebaseapp.com/html5Geolocation/index.html).

## [securityRules - Security Rules](https://geofire.firebaseapp.com/securityRules/rules.json)

This example is just a `rules.json` file which contains some security rules you
can use for your GeoFire node. While this does help to enforce the schema of the data,
it does not prevent a malicious user from scraping or overwriting your GeoFire data.
You should replace all of the `".write"` rules with some custom logic to restrict who
can write to that node.

You can check out the example rules.json file [here](https://geofire.firebaseapp.com/securityRules/rules.json).

## [sfVehicles - Fully-featured Example](https://geofire.firebaseapp.com/sfVehicles/index.html)

This is a fully-featured, complex example which combines GeoFire, Google Maps,
and the [Firebase Transit Open Data Set](https://www.firebase.com/docs/data/real-time-transit-data.html).
Firebase provides a public Firebase which contains the realtime locations of public
transit vehicles in several major US cities, including San Francisco MUNI. The data
set also contains GeoFire data for each vehicle which we used to create this demo.

Drag around the purple circle to the left to see the vehicles which are currently within its radius. The
results update in realtime as you move the circle and as vehicles travel around the city. GeoFire handles all
of the hard work, telling you exactly when vehicles enter and exit the circle. It also selectively loads
only the data geographically close to the circle, meaning GeoFire data for buses in New York or Chicago are not
loaded into memory unnecessarily.

You can check out a live demo of this example [here](https://geofire.firebaseapp.com/sfVehicles/index.html).