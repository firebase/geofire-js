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

## fish1 - Writing To and Reading From GeoFire

This is a very basic example which shows you how to read from and write to GeoFire
and how to handle the promises returned by the `set()`, `get()`, and `remove()`
methods.

You can check out a live demo of this example [here](https://geofire-demos.firebaseapp.com/fish1/index.html).

## fish2 - Using a GeoQuery

This is a more complex example which shows you how to create a `GeoQuery` and
respond to keys moving into, out of, and within the query. It also shows how
to cancel event callback registrations.

You can check out a live demo of this example [here](https://geofire-demos.firebaseapp.com/fish2/index.html).

## fish3 - Loading Initial Data

This example shows you how to achieve a common use case: loading only initial
data. This is accomplished in GeoFire by canceling a `GeoQuery` once its `ready`
event has fired.

You can check out a live demo of this example [here](https://geofire-demos.firebaseapp.com/fish3/index.html).

## securityRules - Security Rules

This example is just a `rules.json` file which contains some security rules you
can use for your GeoFire node. While this does help to enforce the schema of the data,
it does not prevent a malicious user from scraping or overwriting your GeoFire data.
You should replace all of the `".write"` rules with some custom logic to restrict who
can write to that node.

You can check out the example rules.json file [here](https://geofire-demos.firebaseapp.com/securityRules/rules.json).

## sfVehicles - Fully-featured Example

This is a fully-featured, complex example which combines GeoFire, Google Maps,
and the [Firebase Transit Open Data Set](https://www.firebase.com/docs/data/real-time-transit-data.html).
Firebase provides a public Firebase which contains transit data for dozens of
cities in the United States. This data also includes a GeoFire index which is
updated in realtime.

This example uses GeoFire to map all of the vehicles in San Francisco within
a certain radius. You can drag around the circle representing the circle and
see the vehicles update in realtime. GeoFire allows to have a huge data set
like this and only selectively load the data within your query, keeping the
example light and responsive.

You can check out a live demo of this example [here](https://geofire-demos.firebaseapp.com/sfVehicles/index.html).