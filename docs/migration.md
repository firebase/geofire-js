# Migration Guides | GeoFire for JavaScript

Below are instructions for migrating from one version of GeoFire to another. If you are upgrading
several versions at once, make sure you follow the migration instructions for all upgrades.

## `5.x.x` to `6.x.x`

With the release of GeoFire `6.0.0`, GeoFire now uses the new
[Firebase Modular SDK](https://firebase.blog/posts/2021/07/introducing-the-new-firebase-js-sdk#introducing-firestore-lite). This new SDK is incompatible with previous versions, so if you're still using an older version of the Firebase SDK or our [compat module](https://firebase.google.com/docs/web/modular-upgrade#update_imports_to_v9_compat), please stick to version `5.x.x` of GeoFire.

This change only affects the way you interact with the Firebase SDK, but not how you interact with GeoFire.

For example, this:
```js
// Initialize the Firebase SDK
firebase.initializeApp({
  // ...
});

// Create a Firebase reference where GeoFire will store its information
var firebaseRef = firebase.database().ref();

// Create a GeoFire index
var geoFire = new GeoFire(firebaseRef);
```

Becomes:
```js
import { initializeApp } from 'firebase/app';
import { getDatabase, ref } from "firebase/database";

// Initialize the Firebase SDK
initializeApp({
  // ...
});

// Create a Firebase reference where GeoFire will store its information
var firebaseRef = ref(getDatabase());

// Create a GeoFire index
var geoFire = new GeoFire(firebaseRef);
```

See [Firebase's upgrade guide](https://firebase.google.com/docs/web/modular-upgrade) for more details.

## `3.x.x` to `4.x.x`

Let's start off with the good news: RSVP is no longer required required at all to run GeoFire! That
means you can remove RSVP entirely if you aren't using it elsewhere in your project.

The slightly bad news is that you may need to upgrade your Firebase dependency because GeoFire now
uses [the new promises functionality found in Firebase `2.4.0`](https://firebase.googleblog.com/2016/01/keeping-our-promises-and-callbacks_76.html).
Thankfully, upgrading should be as easy as upgrading the Firebase version you are using to `2.4.0`
or higher (if it isn't already).

For you folks using GeoFire with npm, there is one more change you may have to make. With this
release `firebase` is now a peer dependency of `geofire` instead of a regular dependency. As such,
you will need to make sure `firebase` is listed as a regular dependency alongside `geofire` in your
`package.json` (if it isn't already):

```js
// package.json with GeoFire 3.x.x
{
  // ...
  "dependencies": {
    "geofire": "^3.0.0"
  },
  // ...
}

// package.json with GeoFire 4.x.x
{
  // ...
  "dependencies": {
    "firebase": "^2.4.0",
    "geofire": "^4.0.0"
  },
  // ...
}
```


## `3.0.x` to `3.1.x`

With the release of GeoFire `3.1.0`, GeoFire now uses [the new query functionality found in Firebase
`2.0.0`](https://firebase.googleblog.com/2014/11/firebase-now-with-more-querying.html). As a
result, you will need to upgrade to Firebase `2.x.x` and add a new `.indexOn` rule to your Security
and Firebase Rules to get the best performance. You can view [the updated rules here](../examples/securityRules/rules.json)
and [read our docs for more information about indexing your data](https://firebase.google.com/docs/database/security/indexing-data).


## `2.x.x` to `3.x.x`

GeoFire `3.x.x` has the same API as `2.x.x` but uses a different underlying data structure to store
its location data. If you are currently using `2.x.x` and want to upgrade to `3.x.x`, you must run
the [GeoFire 3.x.x migration script](migration/migrateToV3.js) on your Firebase database. This Node.js script
only needs to be run one time and should take only a few seconds to minutes depending on the size of
your data. To run the script, copy the files in the [`migration/`](migration) folder to your machine and
run the following commands:

```bash
$ npm install              # install needed dependencies
$ node migrateToV3.js      # display usage instructions
```

