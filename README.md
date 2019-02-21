# GeoFire for JavaScript [![Build Status](https://travis-ci.org/firebase/geofire-js.svg?branch=master)](https://travis-ci.org/firebase/geofire-js) [![Coverage Status](https://coveralls.io/repos/github/firebase/geofire-js/badge.svg?branch=master)](https://coveralls.io/github/firebase/geofire-js?branch=master) [![Version](https://badge.fury.io/gh/firebase%2Fgeofire-js.svg)](http://badge.fury.io/gh/firebase%2Fgeofire-js)

GeoFire is an open-source library that allows you to store and query a set of keys based on their
geographic location. At its heart, GeoFire simply stores locations with string keys. Its main
benefit, however, is the possibility of retrieving only those keys within a given geographic
area - all in realtime.

GeoFire uses the [Firebase Realtime Database](https://firebase.google.com/docs/database/) for data
storage, allowing query results to be updated in realtime as they change. GeoFire *selectively loads
only the data near certain locations, keeping your applications light and responsive*, even with
extremely large datasets.

GeoFire is designed as a lightweight add-on to Firebase. To keep things simple, GeoFire stores data
in its own format and its own location within your Firebase database. This allows your existing data
format and Security Rules to remain unchanged while still providing you with an easy solution for geo
queries.

A compatible GeoFire client is also available for [Objective-C](https://github.com/firebase/geofire-objc)
and [Java](https://github.com/firebase/geofire-java).


## Table of Contents

 * [Downloading GeoFire](#downloading-geofire)
 * [Documentation](#documentation)
 * [Examples](#examples)
 * [Release Notes](https://github.com/firebase/geofire-js/releases)
 * [Migration Guides](#migration-guides)
 * [Contributing](#contributing)


## Downloading GeoFire

In order to use GeoFire in your project, you need to include the following files in your HTML:

```html
<!-- Firebase -->
<script src="https://www.gstatic.com/firebasejs/3.7.0/firebase.js"></script>

<!-- GeoFire -->
<script src="https://cdn.firebase.com/libs/geofire/5.0.1/geofire.min.js"></script>
```

Use the URL above to download both the minified and non-minified versions of GeoFire from the
Firebase CDN. You can also download them from the
[releases page of this GitHub repository](https://github.com/firebase/geofire-js/releases).

You can also install GeoFire via npm or Bower. If downloading via npm, you will have to install
Firebase separately (because it is a peer dependency to GeoFire):

```bash
$ npm install geofire firebase --save
```

On Bower, the Firebase dependency will be downloaded automatically:

```bash
$ bower install geofire --save
```

## Documentation

* [API Reference](docs/reference.md)


## Examples

You can find a full list of our demos and view the code for each of them in the
[examples directory](examples/) of this repository. The examples cover some of the common use
cases for GeoFire and explain how to protect your data using the
[Firebase Database Security Rules](https://firebase.google.com/docs/database/security/).

### Example Usage

Assume you are building an app to rate bars and you store all information for a bar, e.g. name,
business hours and price range, at `/bars/<bar-id>`. Later, you want to add the possibility for
users to search for bars in their vicinity. This is where GeoFire comes in. You can store the
location for each bar using GeoFire, using the bar IDs as GeoFire keys. GeoFire then allows you to
easily query which bar IDs (the keys) are nearby. To display any additional information about the
bars, you can load the information for each bar returned by the query at `/bars/<bar-id>`.


## Migration Guides

Using an older version of GeoFire and want to upgrade to the latest version? Check out our
[migration guides](docs/migration.md) to find out how!


## Contributing

If you'd like to contribute to GeoFire, please first read through our [contribution
guidelines](.github/CONTRIBUTING.md). Local setup instructions are available [here](.github/CONTRIBUTING.md#local-setup).
