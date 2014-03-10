// geoFire is a helper library for location-based operations in Firebase.
// It provides functions to store data for location querying in Firebase,
// and perform location queries such as location updates and localized searches.
// geoFire stores the location coordinates of a data point as a geohash
// (http://en.wikipedia.org/wiki/Geohash) in Firebase.


(function () {  
    var BITS = [16, 8, 4, 2, 1];
    
    var BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
    
    var NEIGHBORS = {
        "north": {
            "even" : "p0r21436x8zb9dcf5h7kjnmqesgutwvy",
            "odd"  : "bc01fg45238967deuvhjyznpkmstqrwx",
        },
        "east": {
            "even" : "bc01fg45238967deuvhjyznpkmstqrwx",
            "odd"  : "p0r21436x8zb9dcf5h7kjnmqesgutwvy"
        },
        "south": {
            "even" : "14365h7k9dcfesgujnmqp0r2twvyx8zb",
            "odd"  : "238967debc01fg45kmstqrwxuvhjyznp"
        },
        "west": {
            "even" : "238967debc01fg45kmstqrwxuvhjyznp",
            "odd"  : "14365h7k9dcfesgujnmqp0r2twvyx8zb"
        }
    };
    
    var BORDERS = {
        "north" : { "even" : "prxz",     "odd"  : "bcfguvyz" },
        "east"  : { "even" : "bcfguvyz", "odd"  : "prxz"     },
        "south" : { "even" : "028b",     "odd"  : "0145hjnp" },
        "west"  : { "even" : "0145hjnp", "odd"  : "028b"     }
    };

    var noop = function() {};

    var onSearches = {},
        onCallbacks = {};
    
    /**
     * Generate a geohash of the specified precision/string length
     * from the [latitude, longitude] pair, specified as an array.
     */
    function encode(latLon, precision) {
        var lat = latLon[0],
            lon = latLon[1],
            hash = "",
            hashVal = 0,
            bits = 0,
            even = 1,
            latRange = { "min":  -90, "max":  90 },
            lonRange = { "min": -180, "max": 180 },
            val, range, mid;
                    
        precision = Math.min(precision || 12, 22);
        
        if (lat < latRange["min"] || lat > latRange["max"])
            throw "Invalid latitude specified! (" + lat + ")";
        
        if (lon < lonRange["min"] || lon > lonRange["max"])
            throw "Invalid longitude specified! (" + lon + ")";
        
        while (hash.length < precision) {
            val = (even) ? lon : lat;
            range = (even) ? lonRange : latRange;
            
            mid = (range["min"] + range["max"]) / 2;
            if (val > mid) {
                    hashVal = (hashVal << 1) + 1;
                    range["min"] = mid;
            } else {
                hashVal = (hashVal << 1) + 0;
                    range["max"] = mid;
            }
            
            even = !even;
            if (bits < 4) {
                bits++;
                } else {
                    bits = 0;
                    hash += BASE32[hashVal].toString();
                    hashVal = 0;
            }
        }
        
        return hash;
    }
    
    function halve_interval(interval, decimal, mask) {
        var mid = (interval["min"] + interval["max"]) / 2;
        if (decimal & mask)
            interval["min"] = mid;
        else
            interval["max"] = mid;
    }

    /**                                                                                                              
     * Decode the geohash to get the location of the center of the bounding box it represents;
     * the [latitude, longitude] coordinates of the center are returned as an array.
     */ 
    function decode(hash) {
        var latRange = { "min": -90, "max": 90 },
            lonRange = { "min": -180, "max": 180 },
            even = 1,
            lat, lon, decimal, mask, interval;

        for (var i = 0; i < hash.length; i++) {
            decimal = BASE32.indexOf(hash[i]);
            
            for (var j = 0; j < 5; j++) {
                interval = (even) ? lonRange : latRange;
                mask = BITS[j];
                halve_interval(interval, decimal, mask);
                even = !even;
            }
        }
        
        lat = (latRange["min"] + latRange["max"]) / 2;
        lon = (lonRange["min"] + lonRange["max"]) / 2;
        
        return [lat, lon];
    }

    function deg2rad(deg) {
        return deg * Math.PI / 180;
    }

    function rad2deg(rad) {
        return rad * 180 / Math.PI;
    }
    
    function rad2km(rad) {
        return 6371 * rad;
    }
    
    function deg2km(deg) {
        return rad2km(deg2rad(deg));
    }

    function miles2km(miles) {
        return miles * 1.60934;
    }

    function km2miles(kilometers) {
        return kilometers * 0.621371;
    }

    /**
     * Calculate the distance between two points on a globe, via Haversine
     * formula, in kilometers. This is approximate due to the nature of the
     * Earth's radius varying between 6356.752 km through 6378.137 km.
     */
    function dist(lat1, lon1, lat2, lon2) {
        var radius = 6371, // km
            dlat = deg2rad(lat2 - lat1),
            dlon = deg2rad(lon2 - lon1),
            a, c;

        a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dlon / 2) * Math.sin(dlon / 2);
        
        c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return radius * c;
    }

    /**
     * Calculate the distance between two points specified by their geohashes.
     * The distance is calculated in kilometers, using the Haversine formula.
     */
    function distByHash(hash1, hash2) {
        var loc1 = decode(hash1);
        var loc2 = decode(hash2);
        return dist(loc1[0], loc1[1], loc2[0], loc2[1]);
    }

    /**
     * Calculate the dimensions of the bounding box for the specified geohash,
     * in kilometers. This method is even more approximate.
     */
    function dimensions(hash) {
        var length = hash.length,
            parity = (length % 2) ? 1 : 0,
            a = 5 * length - parity;
        
        return {
            "height" : deg2km(180 / Math.pow(2, a / 2)),
            "width"  : deg2km(180 / Math.pow(2, (a - 1) / 2))
                };
    }
  

    /**
     * Return the geohash of the neighboring bounding box in the
     * direction specified,
     */
    function neighbor(hash, dir) {
        hash = hash.toLowerCase();
        
        var lastChar = hash.charAt(hash.length - 1),
            type = (hash.length % 2) ? "odd" : "even",
            base = hash.substring(0, hash.length-1);
        
        if (BORDERS[dir][type].indexOf(lastChar) != -1) {        
            if (base.length <= 0)
                return "";
            base = neighbor(base, dir);
        }

        return base + BASE32[NEIGHBORS[dir][type].indexOf(lastChar)];
    }

    /**
     * Return the geohashes of all neighboring bounding boxes.
     */
    function neighbors(hash) {
        var neighbors = [];
        neighbors.push(neighbor(hash, "north"));
        neighbors.push(neighbor(hash, "south"));
        neighbors.push(neighbor(hash, "east"));
        neighbors.push(neighbor(hash, "west"));
        neighbors.push(neighbor(neighbors[0], "east"));
        neighbors.push(neighbor(neighbors[0], "west"));
        neighbors.push(neighbor(neighbors[1], "east"));
        neighbors.push(neighbor(neighbors[1], "west"));
        return neighbors;
    }
  
    function values(obj) {
        var values = [];
        for (var key in obj) {
            if (hasOwnProperty.call(obj, key)) {
                values.push(obj[key]);
            }
        }
        return values;
    }
    
    function setHash(data, geohash) {
        var primitive = JSON.stringify(data),
            copy = JSON.parse(primitive);

        copy.geohash = geohash;
        return copy;
    }

    function geoFire(firebaseRef) {
        if (typeof firebaseRef === "string") {
            throw new Error("Please provide a Firebase reference instead " +
                            "of a URL, eg: new Firebase(url)");
        }

        this._firebase = firebaseRef.child('geoFire').child('dataByHash');
        this._agents = firebaseRef.child('geoFire').child('dataById');
    }
    
    geoFire.prototype.encode = geoFire.encode = encode;
    geoFire.prototype.decode = geoFire.decode = decode;
    geoFire.prototype.dimensions = geoFire.dimensions = dimensions;
    geoFire.prototype.dist = geoFire.dist = dist;
    geoFire.prototype.distByHash = geoFire.distByHash = distByHash;
    geoFire.prototype.neighbor = geoFire.neighbor = neighbor;
    geoFire.prototype.neighbors = geoFire.neighbors = neighbors;
    geoFire.prototype.miles2km = geoFire.miles2km = miles2km;
    geoFire.prototype.km2miles = geoFire.km2miles = km2miles;

    /**
     * Store data by location, specified by a [latitude, longitude] array.
     * When the insert has completed, the option callback function (if provided) is called
     * with null on success/ Error on failure.
     */
    geoFire.prototype.insertByLoc = function insertByLoc(latLon, data, cb) {
        var cb = cb || noop,
            geohash = encode(latLon);

        this._firebase.child(geohash).push(data, function(error) {
                cb(error);
            });
    };
    
    /**
     * Store data by location, specified by a [latitude, longitude] array, and
     * a user-provided Id. When the insert has completed, the option callback
     * function (if provided) is called with null on success/ Error on failure. 
     * Data inserted using this function can be queried by location or by id. 
     */
    geoFire.prototype.insertByLocWithId = function insertByLocWithId(latLon, id, data, cb) {
        var self = this,
            cb = cb || noop,
            geohash = encode(latLon);

        delete data.geohash;
        this._firebase.child(geohash).child(id).set(data, function(error) {
                if (!error) {
                    var copy = setHash(data, geohash);
                    self._agents.child(id).set(copy, function(error) {
                            cb(error);
                        });
                } else {
                    cb(error);
                }
            });
    };
    
    /**
     * Remove the data point with the specified Id; the data point must have
     * been inserted using insertByLocWithId. On completion, the optional callback
     * function (if provided) is called with null on success/ Error on failure.
     */
    geoFire.prototype.removeById = function removeById(id, cb) {
        var self = this,
            cb = cb || noop;

        this._agents.child(id).once('value', 
                                    function (snapshot) {
                                        var data = snapshot.val();
                                        if (!data || !data['geohash']) return;
                                        self._firebase.child(data.geohash).child(id).remove(function(error) {
                                                if (!error)
                                                    self._agents.child(id).remove(cb);                                                    
                                                else
                                                    cb(error);
                                            });
                                    });
    };

    /**
     * Get the location of the data point with the specified Id; the data point
     * must have been inserted using insertByLocWithId. The location passed to the
     * callback function as a [latitude, longitude] array on success/ Null on failure.
     */
    geoFire.prototype.getLocById = function getLocById(id, cb) {
        var self = this;

        this._agents.child(id).once('value',
                                    function (snapshot) {
                                        var data = snapshot.val(),
                                            arg = (data === null) ? null : (self.decode(data.geohash));
                                        cb(arg);
                                    });
    };
    
    /**
     * Update the location of the data point with the specified Id; the data
     * point must have been inserted using insertByLocWithId. The optional callback
     * function (if provided) is called with null on success/ Error on failure.
     */
    geoFire.prototype.updateLocForId = function updateLocForId(latLon, id, cb) {
        var self = this,
            cb = cb || noop;
    
        this._agents.child(id).once('value',
                                    function (snapshot) {
                                        var data = snapshot.val();         
                                        if (data === null) {
                                            cb(new Error("geoFire.updateLocForId error: Invalid Id argument."));
                                        } else {
                                            var geohash = data.geohash;
                                            self._firebase.child(geohash).child(id).remove(function(error) {
                                                    if (!error) {
                                                        self.insertByLocWithId(latLon, id, data, cb);
                                                    } else 
                                                        cb(error);
                                                });
                                        }
                                    });

    };

    /**
     * Find all data points within the specified radius, in kilometers,
     * from the specified latitude, longitude pair, passed in as an array.
     * The matching points are passed to the callback function as an array in distance sorted order.
     * The callback function is called once, with the initial set of search results;
     * it is not called when the set of search results changes.
     */
    geoFire.prototype.getPointsNearLoc = function getPointsNearLoc(latLon,
                                                                   radius,
                                                                   cb) {
        
        var hash = encode(latLon);
        this.searchRadius(hash, radius, 0, cb);
    };

    /**
     * Find all data points within the specified radius, in kilometers,
     * from the specified latitude, longitude pair, passed in as an array.
     * The matching points are passed to the callback function as an array in distance sorted order.
     * The callback function is called with the initial set of search results and
     * each time the set of search results changes.
    */
    geoFire.prototype.onPointsNearLoc = function onPointsNearLoc(latLon,
                                                                 radius,
                                                                 cb) {
        var hash = encode(latLon);
        this.searchRadius(hash, radius, 1, cb);
    }

    /**
     * Find all data points within the specified radius, in kilometers,
     * from the point with the specified Id; the point must have been inserted using insertByLocWithId.
     * The matching points are passed to the callback function as an array in distance sorted order.
     * The callback function is called once, with the initial set of search results;
     * it is not called when the set of search results changes.
     */
    geoFire.prototype.getPointsNearId = function getPointsNearId(id, radius,
                                                                 cb) {
        var self = this;
        this._agents.child(id).once('value',
                                    function (snapshot) {
                                        var data = snapshot.val();
                                        if (data === null)
                                            cb(null);
                                        else
                                            self.searchRadius(data.geohash, radius, 0, cb);
                                    });
    }

    /**                                                                                             
     * Find all data points within the specified radius, in kilometers,                           
     * from the point with the specified Id; the point must have been inserted using insertByLocWithId.
     * The matching points are passed to the callback function as an array in distance sorted order. 
     * The callback function is called with the initial set of search results and
     * each time the set of search results changes. 
     */
    geoFire.prototype.onPointsNearId = function onPointsNearId(id, radius, cb) {
        var self = this;
        this._agents.child(id).once('value',
                                    function (snapshot) {
                                        var data = snapshot.val();
                                        if (data === null)
                                            cb(null);
                                        else
                                            self.searchRadius(data.geohash, radius, 1, cb);
                                    });
    }
    
    /**
     * Find all data points within the specified radius, in kilometers,
     * from the point with the specified geohash.
     * The matching points are passed to the callback function in distance sorted order.
     * If the setAlert flag is set, the callback function is called each time the search results change i.e.
     * if the set of data points that are within the radius changes.
     */
    geoFire.prototype.searchRadius = function searchRadius(srcHash, radius,
                                                           setAlert, cb) {
        var self = this,
        hash = srcHash,
        neighborPrefixes = [],
        matchesByPrefix = {},
        matchesFiltered = [],
        distDict = {},
        i = 0;

        // An approximation of the bounding box dimension per hash length.
        var boundingBoxShortestEdgeByHashLength = [ null, 5003.771699005143,
                                                    625.4714623756429,
                                                    156.36786559391072,
                                                    19.54598319923884,
                                                    4.88649579980971,
                                                    0.6108119749762138 ];
        var zoomLevel = 6;
        while (radius > boundingBoxShortestEdgeByHashLength[zoomLevel])
            zoomLevel -= 1;
        
        hash = hash.substring(0, zoomLevel);
        
        // TODO: Be smarter about this, and only zoom out if actually optimal.
        queries = this.neighbors(hash);
        queries.push(hash);
        
        // Get unique list of neighbor hashes.
        var uniquesObj = {};
        for (var ix = 0; ix < queries.length; ix++) {
            if (queries[ix].length > 0) {
                uniquesObj[queries[ix]] = queries[ix];
                matchesByPrefix[queries[ix]] = [];
            }
        }
        queries = values(uniquesObj);
        delete uniquesObj;
        
        var resultHandler = function(snapshot) {
            var prefix = this.prefix;
            matchesByPrefix[prefix] = [];

            // Compile the results for each of the queries as they return.
            var matchSet = snapshot.val();
            for (var hash in matchSet) {
                for (var locationId in matchSet[hash]) {
                    matchesByPrefix[prefix].push([hash, matchSet[hash][locationId]]);
                }
            }

            // Wait for each of the queries to return before filtering and sorting.
            if (++i >= queries.length) {
                // Filter the returned queries using the specified radius.
                for (var prefix in matchesByPrefix) {
                    var matches = matchesByPrefix[prefix];
                    for (var jx = 0; jx < matches.length; jx++) {
                        var match = matches[jx],
                            matchHash = match[0],
                            matchElt = match[1],
                            pointDist = distByHash(srcHash, matchHash);
                        
                        if (pointDist <= radius) {
                            distDict[matchElt] = pointDist;
                            matchesFiltered.push(matchElt);
                        }
                    }
                }

                // Sort the results by radius.                                          
                matchesFiltered.sort(function(a, b) {
                    return distDict[a] - distDict[b];
                });
                cb(matchesFiltered);
            }
        };
        resultHandler.callback = cb;

        var prefixList = [];
        for (var ix = 0; ix < queries.length; ix++) {
            var startPrefix = queries[ix].substring(0, zoomLevel);
            var endPrefix = startPrefix;
            endPrefix = startPrefix + "~";

            prefixList.push(startPrefix);
            
            if (setAlert) {
                prefixList.push(startPrefix);
                
                this._firebase
                    .startAt(null, startPrefix)
                    .endAt(null, endPrefix)
                    .on('value', resultHandler, { prefix: startPrefix });
            } else {
                this._firebase
                    .startAt(null, startPrefix)
                    .endAt(null, endPrefix)
                    .once('value', resultHandler, { prefix: startPrefix });
            }
        }
        
        if (setAlert) {
            if ([srcHash, radius] in onSearches) {
                onSearches[[srcHash, radius]].count += 1;
                onCallbacks[[srcHash, radius]].push(resultHandler);
            } else {
                var searchRecord = { prefixes: prefixList, count: 1 };
                onSearches[[srcHash, radius]] = searchRecord;
                onCallbacks[[srcHash, radius]] = [resultHandler];
            }
        }
    };
    
    /**
     * Cancels a search that was initiated by onPointsNearLoc with the source
     * point, radius and callback specified. If no callback is specified, all
     * outstanding searches for the source point-radius pair are cancelled.
     * An offPointsNearLoc call cancels one onPointsNearLoc call.
     * The function does not return anything.
     */
    geoFire.prototype.offPointsNearLoc = function offPointsNearLoc(latLon, radius,
                                                                   cb) {
        var hash = encode(latLon);
        this.cancelSearch(hash, radius, cb);
    }
    
    /**
     * Cancels a search that was initiated by onPointsNearId with the source
     * point, radius and callback specified. If no callback is specified, all                                            
     * outstanding searches for the source point-radius pair are cancelled
     * An offPointsNearId call cancels one onPointsNearId call.
     * The function does not return anything.
     */
    geoFire.prototype.offPointsNearId = function offPointsNearId(id, radius, cb) {
        var self = this;
        this._agents.child(id).once('value',
                                    function (snapshot) {
                                        var data = snapshot.val();
                                        if (data === null)
                                            return;
                                        else
                                            self.cancelSearch(data.geohash, radius, cb);
                                    });
    }
    
    /**
     * Cancels a search that was initiated by onPointsNearLoc/ onPointsNearId
     * with the source point, radius and callback specified. If no callback is specified,
     * all aoutstanding searches for the source point-radius pair are cancelled. 
     * A call cancels one corresponding call. The function does not return anything.                                                                       
     */
    geoFire.prototype.cancelSearch = function cancelSearch(srcHash, radius, cb) {
        var self = this;

        // Small optimization
        if (!([srcHash, radius] in onSearches))
            return;
        
        var searchRecord = onSearches[[srcHash, radius]],
            prefixes = searchRecord.prefixes;
        var callbacks = onCallbacks[[srcHash, radius]];

        var turnOff = function(cancel) {
            for (var i = 0; i < prefixes.length; i++) {
                var startPrefix = prefixes[i];
                var endPrefix = startPrefix;
                endPrefix = startPrefix + "~";
                
                self._firebase
                    .startAt(null, startPrefix)
                    .endAt(null, endPrefix)
                    .off('value', cancel);
            }

            searchRecord.count -= 1;
        }

        // No pending searches
        if (searchRecord.count <= 0) {
            delete onSearches[[srcHash, radius]];
            delete onCallbacks[[srcHash, radius]];
            return;
        }
        
        // No callback specified, therefore cancel all pending.
        if (typeof cb === 'undefined') {
            for (var i = 0; i < callbacks.length; i++) {
                turnOff(callbacks[i]);
                callbacks.splice(i, 1);
            }
            return;
        }

        // Find matching and cancel
        for (var j = 0; j < callbacks.length; j++) {
            if (callbacks[j].callback == cb) {
                turnOff(callbacks[j]);
                callbacks.splice(j, 1);
                break;
            }
        }
        
        // No matching callbacks
        return;
    }

    if (typeof module === "undefined") {
        self.geoFire = geoFire;
    } else {
        module.exports = geoFire;
    }
})();
