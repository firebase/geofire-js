v3.0.0
-------------
Release Date: 2014-08-15

  * __NOTE: GeoFire 3.0 is not compatible with GeoFire 2.x and has been upgraded to be compatible with GeoFire for Java and Objective-C.__
  * Created migration script to update GeoFire index from version 2.x to 3.0.
  * Simplified underlying data structure used to improve performance and memory usage.
  * Fixed issue with missing Firebase dependency when run in Node.js.
  * Added better error handling for `NaN` inputs.
  * Added HTML5 geolocation and query builder examples.

v2.1.1
-------------
Release Date: 2014-07-14

  * Improved performance of calculating bounding box around query.
  * Fixed bug where we created hundreds of outstanding Firebase queries.

v2.1.0
-------------
Release Date: 2014-06-29

  * Added GeoFire.ref() method.
  * Added error checking for firebaseRef parameter.

v2.0.2
-------------
Release Date: 2014-06-23

  * Fixed bug where we cleaned up a location which had not yet been added, resulting in a console error.

v2.0.1
-------------
Release Date: 2014-06-23

  * Fixed casing issue when including RSVP via npm require().

v2.0.0
-------------
Release Date: 2014-06-23

  * Complete re-write of the entire GeoFire library.
  * Brand new API which is more in line with the Firebase web client.
  * Improved performance.
  * Comprehensive test suite.
  * Fixed some long-standing bugs from previous versions.
