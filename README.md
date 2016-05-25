# GeoFire for JavaScript — Realtime location queries with Firebase

[![Build Status](https://travis-ci.org/firebase/geofire-js.svg?branch=master)](https://travis-ci.org/firebase/geofire-js)
[![Coverage Status](https://coveralls.io/repos/github/firebase/geofire-js/badge.svg?branch=master)](https://coveralls.io/github/firebase/geofire-js?branch=master)
[![Version](https://badge.fury.io/gh/firebase%2Fgeofire-js.svg)](http://badge.fury.io/gh/firebase%2Fgeofire-js)


## Table of Contents

 * [Overview](#overview)
 * [Live Demos](#live-demos)
 * [Downloading GeoFire](#downloading-geofire)
 * [Documentation](#documentation)
 * [Migration Guides](#migration-guides)
 * [Contributing](#contributing)


## Overview

GeoFire is an open-source library that allows you to store and query a set of keys based on their
geographic location. At its heart, GeoFire simply stores locations with string keys. Its main
benefit, however, is the possibility of retrieving only those keys within a given geographic
area - all in realtime.

GeoFire uses the [Firebase Realtime Database](https://firebase.google.com/docs/database/) for data
storage, allowing query results to be updated in realtime as they change. GeoFire *selectively loads
only the data near certain locations, keeping your applications light and responsive*, even with
extremely large datasets. You can [sign up here for a free account](https://firebase.google.com).

A compatible GeoFire client is also available for [Objective-C](https://github.com/firebase/geofire-objc)
and [Java](https://github.com/firebase/geofire-java).

### Integrating GeoFire with your data

GeoFire is designed as a lightweight add-on to Firebase. To keep things simple, GeoFire stores data
in its own format and its own location within your Firebase database. This allows your existing data
format and Security Rules to remain unchanged while still providing you with an easy solution for geo
queries.

### Example Usage

Assume you are building an app to rate bars and you store all information for a bar, e.g. name,
business hours and price range, at `/bars/<bar-id>`. Later, you want to add the possibility for
users to search for bars in their vicinity. This is where GeoFire comes in. You can store the
location for each bar using GeoFire, using the bar IDs as GeoFire keys. GeoFire then allows you to
easily query which bar IDs (the keys) are nearby. To display any additional information about the
bars, you can load the information for each bar returned by the query at `/bars/<bar-id>`.


## Live Demos

You can find a full list of our demos and view the code for each of them in the
[examples directory](examples/) of this repository. The examples cover some of the common use
cases for GeoFire and explain how to protect your data using the
[Firebase Database Security Rules](https://firebase.google.com/docs/database/security/).


## Downloading GeoFire

In order to use GeoFire in your project, you need to include the following files in your HTML:

```html
<!-- Firebase -->
<script src="https://www.gstatic.com/firebasejs/3.0.2/firebase.js"></script>

<!-- GeoFire -->
<script src="https://cdn.firebase.com/libs/geofire/4.1.1/geofire.min.js"></script>
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

[API Reference](docs/reference.md)


## Migration Guides

Using an older version of GeoFire and want to upgrade to the latest version? Check out our
[migration guides](docs/migration.md) to find out how!


## Contributing

If you'd like to contribute to GeoFire, you'll need to run the following commands to get your environment set up:

```bash
$ git clone https://github.com/firebase/geofire-js.git
$ cd geofire-js         # go to the geofire directory
$ npm install -g gulp   # globally install gulp task runner
$ npm install -g bower  # globally install Bower package manager
$ npm install           # install local npm build / test dependencies
$ bower install         # install local JavaScript dependencies
$ gulp watch            # watch for source file changes
```

`gulp watch` will watch for changes in the `/src/` directory and lint, concatenate, and minify the source files when a change occurs. The output files - `geofire.js` and `geofire.min.js` - are written to the `/dist/` directory.

You can run the test suite by navigating to `file:///path/to/geofire-js/tests/index.html` or via the command line using `gulp test`.
