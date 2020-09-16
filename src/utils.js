// Default geohash length
exports.GEOHASH_PRECISION = 10;
// Characters used in location geohashes
exports.BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
// The meridional circumference of the earth in meters
exports.EARTH_MERI_CIRCUMFERENCE = 40007860;
// Length of a degree latitude at the equator
exports.METERS_PER_DEGREE_LATITUDE = 110574;
// Number of bits per geohash character
exports.BITS_PER_CHAR = 5;
// Maximum length of a geohash in bits
exports.MAXIMUM_BITS_PRECISION = 22 * exports.BITS_PER_CHAR;
// Equatorial radius of the earth in meters
exports.EARTH_EQ_RADIUS = 6378137.0;
// The following value assumes a polar radius of
// const EARTH_POL_RADIUS = 6356752.3;
// The formulate to calculate E2 is
// E2 == (EARTH_EQ_RADIUS^2-EARTH_POL_RADIUS^2)/(EARTH_EQ_RADIUS^2)
// The exact value is used here to avoid rounding errors
exports.E2 = 0.00669447819799;
// Cutoff for rounding errors on double calculations
exports.EPSILON = 1e-12;
function log2(x) {
    return Math.log(x) / Math.log(2);
}
/**
 * Validates the inputted key and throws an error if it is invalid.
 *
 * @param key The key to be verified.
 */
function validateKey(key) {
    var error;
    if (typeof key !== 'string') {
        error = 'key must be a string';
    }
    else if (key.length === 0) {
        error = 'key cannot be the empty string';
    }
    else if (1 + exports.GEOHASH_PRECISION + key.length > 755) {
        // Firebase can only stored child paths up to 768 characters
        // The child path for this key is at the least: 'i/<geohash>key'
        error = 'key is too long to be stored in Firebase';
    }
    else if (/[\[\].#$\/\u0000-\u001F\u007F]/.test(key)) {
        // Firebase does not allow node keys to contain the following characters
        error = 'key cannot contain any of the following characters: . # $ ] [ /';
    }
    if (typeof error !== 'undefined') {
        throw new Error('Invalid GeoFire key \'' + key + '\': ' + error);
    }
}
exports.validateKey = validateKey;
/**
 * Validates the inputted location and throws an error if it is invalid.
 *
 * @param location The [latitude, longitude] pair to be verified.
 */
function validateLocation(location) {
    var error;
    if (!Array.isArray(location)) {
        error = 'location must be an array';
    }
    else if (location.length !== 2) {
        error = 'expected array of length 2, got length ' + location.length;
    }
    else {
        var latitude = location[0];
        var longitude = location[1];
        if (typeof latitude !== 'number' || isNaN(latitude)) {
            error = 'latitude must be a number';
        }
        else if (latitude < -90 || latitude > 90) {
            error = 'latitude must be within the range [-90, 90]';
        }
        else if (typeof longitude !== 'number' || isNaN(longitude)) {
            error = 'longitude must be a number';
        }
        else if (longitude < -180 || longitude > 180) {
            error = 'longitude must be within the range [-180, 180]';
        }
    }
    if (typeof error !== 'undefined') {
        throw new Error('Invalid GeoFire location \'' + location + '\': ' + error);
    }
}
exports.validateLocation = validateLocation;
/**
 * Validates the inputted geohash and throws an error if it is invalid.
 *
 * @param geohash The geohash to be validated.
 */
function validateGeohash(geohash) {
    var error;
    if (typeof geohash !== 'string') {
        error = 'geohash must be a string';
    }
    else if (geohash.length === 0) {
        error = 'geohash cannot be the empty string';
    }
    else {
        for (var _i = 0; _i < geohash.length; _i++) {
            var letter = geohash[_i];
            if (exports.BASE32.indexOf(letter) === -1) {
                error = 'geohash cannot contain \'' + letter + '\'';
            }
        }
    }
    if (typeof error !== 'undefined') {
        throw new Error('Invalid GeoFire geohash \'' + geohash + '\': ' + error);
    }
}
exports.validateGeohash = validateGeohash;
/**
 * Validates the inputted query criteria and throws an error if it is invalid.
 *
 * @param newQueryCriteria The criteria which specifies the query's center and/or radius.
 * @param requireCenterAndRadius The criteria which center and radius required.
 */
function validateCriteria(newQueryCriteria, requireCenterAndRadius) {
    if (requireCenterAndRadius === void 0) { requireCenterAndRadius = false; }
    if (typeof newQueryCriteria !== 'object') {
        throw new Error('query criteria must be an object');
    }
    else if (typeof newQueryCriteria.center === 'undefined' && typeof newQueryCriteria.radius === 'undefined') {
        throw new Error('radius and/or center must be specified');
    }
    else if (requireCenterAndRadius && (typeof newQueryCriteria.center === 'undefined' || typeof newQueryCriteria.radius === 'undefined')) {
        throw new Error('query criteria for a new query must contain both a center and a radius');
    }
    // Throw an error if there are any extraneous attributes
    var keys = Object.keys(newQueryCriteria);
    for (var _i = 0; _i < keys.length; _i++) {
        var key = keys[_i];
        if (key !== 'center' && key !== 'radius') {
            throw new Error('Unexpected attribute \'' + key + '\' found in query criteria');
        }
    }
    // Validate the 'center' attribute
    if (typeof newQueryCriteria.center !== 'undefined') {
        validateLocation(newQueryCriteria.center);
    }
    // Validate the 'radius' attribute
    if (typeof newQueryCriteria.radius !== 'undefined') {
        if (typeof newQueryCriteria.radius !== 'number' || isNaN(newQueryCriteria.radius)) {
            throw new Error('radius must be a number');
        }
        else if (newQueryCriteria.radius < 0) {
            throw new Error('radius must be greater than or equal to 0');
        }
    }
}
exports.validateCriteria = validateCriteria;
/**
 * Converts degrees to radians.
 *
 * @param degrees The number of degrees to be converted to radians.
 * @returns The number of radians equal to the inputted number of degrees.
 */
function degreesToRadians(degrees) {
    if (typeof degrees !== 'number' || isNaN(degrees)) {
        throw new Error('Error: degrees must be a number');
    }
    return (degrees * Math.PI / 180);
}
exports.degreesToRadians = degreesToRadians;
/**
 * Generates a geohash of the specified precision/string length from the  [latitude, longitude]
 * pair, specified as an array.
 *
 * @param location The [latitude, longitude] pair to encode into a geohash.
 * @param precision The length of the geohash to create. If no precision is specified, the
 * global default is used.
 * @returns The geohash of the inputted location.
 */
function encodeGeohash(location, precision) {
    if (precision === void 0) { precision = exports.GEOHASH_PRECISION; }
    validateLocation(location);
    if (typeof precision !== 'undefined') {
        if (typeof precision !== 'number' || isNaN(precision)) {
            throw new Error('precision must be a number');
        }
        else if (precision <= 0) {
            throw new Error('precision must be greater than 0');
        }
        else if (precision > 22) {
            throw new Error('precision cannot be greater than 22');
        }
        else if (Math.round(precision) !== precision) {
            throw new Error('precision must be an integer');
        }
    }
    var latitudeRange = {
        min: -90,
        max: 90
    };
    var longitudeRange = {
        min: -180,
        max: 180
    };
    var hash = '';
    var hashVal = 0;
    var bits = 0;
    var even = 1;
    while (hash.length < precision) {
        var val = even ? location[1] : location[0];
        var range = even ? longitudeRange : latitudeRange;
        var mid = (range.min + range.max) / 2;
        if (val > mid) {
            hashVal = (hashVal << 1) + 1;
            range.min = mid;
        }
        else {
            hashVal = (hashVal << 1) + 0;
            range.max = mid;
        }
        even = !even;
        if (bits < 4) {
            bits++;
        }
        else {
            bits = 0;
            hash += exports.BASE32[hashVal];
            hashVal = 0;
        }
    }
    return hash;
}
exports.encodeGeohash = encodeGeohash;
/**
 * Calculates the number of degrees a given distance is at a given latitude.
 *
 * @param distance The distance to convert.
 * @param latitude The latitude at which to calculate.
 * @returns The number of degrees the distance corresponds to.
 */
function metersToLongitudeDegrees(distance, latitude) {
    var radians = degreesToRadians(latitude);
    var num = Math.cos(radians) * exports.EARTH_EQ_RADIUS * Math.PI / 180;
    var denom = 1 / Math.sqrt(1 - exports.E2 * Math.sin(radians) * Math.sin(radians));
    var deltaDeg = num * denom;
    if (deltaDeg < exports.EPSILON) {
        return distance > 0 ? 360 : 0;
    }
    else {
        return Math.min(360, distance / deltaDeg);
    }
}
exports.metersToLongitudeDegrees = metersToLongitudeDegrees;
/**
 * Calculates the bits necessary to reach a given resolution, in meters, for the longitude at a
 * given latitude.
 *
 * @param resolution The desired resolution.
 * @param latitude The latitude used in the conversion.
 * @return The bits necessary to reach a given resolution, in meters.
 */
function longitudeBitsForResolution(resolution, latitude) {
    var degs = metersToLongitudeDegrees(resolution, latitude);
    return (Math.abs(degs) > 0.000001) ? Math.max(1, log2(360 / degs)) : 1;
}
exports.longitudeBitsForResolution = longitudeBitsForResolution;
/**
 * Calculates the bits necessary to reach a given resolution, in meters, for the latitude.
 *
 * @param resolution The bits necessary to reach a given resolution, in meters.
 * @returns Bits necessary to reach a given resolution, in meters, for the latitude.
 */
function latitudeBitsForResolution(resolution) {
    return Math.min(log2(exports.EARTH_MERI_CIRCUMFERENCE / 2 / resolution), exports.MAXIMUM_BITS_PRECISION);
}
exports.latitudeBitsForResolution = latitudeBitsForResolution;
/**
 * Wraps the longitude to [-180,180].
 *
 * @param longitude The longitude to wrap.
 * @returns longitude The resulting longitude.
 */
function wrapLongitude(longitude) {
    if (longitude <= 180 && longitude >= -180) {
        return longitude;
    }
    var adjusted = longitude + 180;
    if (adjusted > 0) {
        return (adjusted % 360) - 180;
    }
    else {
        return 180 - (-adjusted % 360);
    }
}
exports.wrapLongitude = wrapLongitude;
/**
 * Calculates the maximum number of bits of a geohash to get a bounding box that is larger than a
 * given size at the given coordinate.
 *
 * @param coordinate The coordinate as a [latitude, longitude] pair.
 * @param size The size of the bounding box.
 * @returns The number of bits necessary for the geohash.
 */
function boundingBoxBits(coordinate, size) {
    var latDeltaDegrees = size / exports.METERS_PER_DEGREE_LATITUDE;
    var latitudeNorth = Math.min(90, coordinate[0] + latDeltaDegrees);
    var latitudeSouth = Math.max(-90, coordinate[0] - latDeltaDegrees);
    var bitsLat = Math.floor(latitudeBitsForResolution(size)) * 2;
    var bitsLongNorth = Math.floor(longitudeBitsForResolution(size, latitudeNorth)) * 2 - 1;
    var bitsLongSouth = Math.floor(longitudeBitsForResolution(size, latitudeSouth)) * 2 - 1;
    return Math.min(bitsLat, bitsLongNorth, bitsLongSouth, exports.MAXIMUM_BITS_PRECISION);
}
exports.boundingBoxBits = boundingBoxBits;
/**
 * Calculates eight points on the bounding box and the center of a given circle. At least one
 * geohash of these nine coordinates, truncated to a precision of at most radius, are guaranteed
 * to be prefixes of any geohash that lies within the circle.
 *
 * @param center The center given as [latitude, longitude].
 * @param radius The radius of the circle.
 * @returns The eight bounding box points.
 */
function boundingBoxCoordinates(center, radius) {
    var latDegrees = radius / exports.METERS_PER_DEGREE_LATITUDE;
    var latitudeNorth = Math.min(90, center[0] + latDegrees);
    var latitudeSouth = Math.max(-90, center[0] - latDegrees);
    var longDegsNorth = metersToLongitudeDegrees(radius, latitudeNorth);
    var longDegsSouth = metersToLongitudeDegrees(radius, latitudeSouth);
    var longDegs = Math.max(longDegsNorth, longDegsSouth);
    return [
        [center[0], center[1]],
        [center[0], wrapLongitude(center[1] - longDegs)],
        [center[0], wrapLongitude(center[1] + longDegs)],
        [latitudeNorth, center[1]],
        [latitudeNorth, wrapLongitude(center[1] - longDegs)],
        [latitudeNorth, wrapLongitude(center[1] + longDegs)],
        [latitudeSouth, center[1]],
        [latitudeSouth, wrapLongitude(center[1] - longDegs)],
        [latitudeSouth, wrapLongitude(center[1] + longDegs)]
    ];
}
exports.boundingBoxCoordinates = boundingBoxCoordinates;
/**
 * Calculates the bounding box query for a geohash with x bits precision.
 *
 * @param geohash The geohash whose bounding box query to generate.
 * @param bits The number of bits of precision.
 * @returns A [start, end] pair of geohashes.
 */
function geohashQuery(geohash, bits) {
    validateGeohash(geohash);
    var precision = Math.ceil(bits / exports.BITS_PER_CHAR);
    if (geohash.length < precision) {
        return [geohash, geohash + '~'];
    }
    geohash = geohash.substring(0, precision);
    var base = geohash.substring(0, geohash.length - 1);
    var lastValue = exports.BASE32.indexOf(geohash.charAt(geohash.length - 1));
    var significantBits = bits - (base.length * exports.BITS_PER_CHAR);
    var unusedBits = (exports.BITS_PER_CHAR - significantBits);
    // delete unused bits
    var startValue = (lastValue >> unusedBits) << unusedBits;
    var endValue = startValue + (1 << unusedBits);
    if (endValue > 31) {
        return [base + exports.BASE32[startValue], base + '~'];
    }
    else {
        return [base + exports.BASE32[startValue], base + exports.BASE32[endValue]];
    }
}
exports.geohashQuery = geohashQuery;
/**
 * Calculates a set of queries to fully contain a given circle. A query is a [start, end] pair
 * where any geohash is guaranteed to be lexiographically larger then start and smaller than end.
 *
 * @param center The center given as [latitude, longitude] pair.
 * @param radius The radius of the circle.
 * @return An array of geohashes containing a [start, end] pair.
 */
function geohashQueries(center, radius) {
    validateLocation(center);
    var queryBits = Math.max(1, boundingBoxBits(center, radius));
    var geohashPrecision = Math.ceil(queryBits / exports.BITS_PER_CHAR);
    var coordinates = boundingBoxCoordinates(center, radius);
    var queries = coordinates.map(function (coordinate) {
        return geohashQuery(encodeGeohash(coordinate, geohashPrecision), queryBits);
    });
    // remove duplicates
    return queries.filter(function (query, index) {
        return !queries.some(function (other, otherIndex) {
            return index > otherIndex && query[0] === other[0] && query[1] === other[1];
        });
    });
}
exports.geohashQueries = geohashQueries;
/**
 * Encodes a location and geohash as a GeoFire object.
 *
 * @param location The location as [latitude, longitude] pair.
 * @param geohash The geohash of the location.
 * @returns The location encoded as GeoFire object.
 */
function encodeGeoFireObject(location, geohash) {
    validateLocation(location);
    validateGeohash(geohash);
    return { '.priority': geohash, 'g': geohash, 'l': location };
}
exports.encodeGeoFireObject = encodeGeoFireObject;
/**
 * Decodes the location given as GeoFire object. Returns null if decoding fails.
 *
 * @param geoFireObj The location encoded as GeoFire object.
 * @returns The location as [latitude, longitude] pair or null if decoding fails.
 */
function decodeGeoFireObject(geoFireObj) {
    if (geoFireObj && 'l' in geoFireObj && Array.isArray(geoFireObj.l) && geoFireObj.l.length === 2) {
        return geoFireObj.l;
    }
    else {
        throw new Error('Unexpected location object encountered: ' + JSON.stringify(geoFireObj));
    }
}
exports.decodeGeoFireObject = decodeGeoFireObject;
/**
 * Returns the key of a Firebase snapshot across SDK versions.
 *
 * @param A Firebase snapshot.
 * @returns The Firebase snapshot's key.
 */
function geoFireGetKey(snapshot) {
    var key;
    if (typeof snapshot.key === 'string' || snapshot.key === null) {
        key = snapshot.key;
    }
    else if (typeof snapshot.key === 'function') {
        // @ts-ignore
        key = snapshot.key();
    }
    else {
        // @ts-ignore
        key = snapshot.name();
    }
    return key;
}
exports.geoFireGetKey = geoFireGetKey;
/**
 * Method which calculates the distance, in kilometers, between two locations,
 * via the Haversine formula. Note that this is approximate due to the fact that the
 * Earth's radius varies between 6356.752 km and 6378.137 km.
 *
 * @param location1 The [latitude, longitude] pair of the first location.
 * @param location2 The [latitude, longitude] pair of the second location.
 * @returns The distance, in kilometers, between the inputted locations.
 */
function distance(location1, location2) {
    validateLocation(location1);
    validateLocation(location2);
    var radius = 6371; // Earth's radius in kilometers
    var latDelta = degreesToRadians(location2[0] - location1[0]);
    var lonDelta = degreesToRadians(location2[1] - location1[1]);
    var a = (Math.sin(latDelta / 2) * Math.sin(latDelta / 2)) +
        (Math.cos(degreesToRadians(location1[0])) * Math.cos(degreesToRadians(location2[0])) *
            Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2));
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return radius * c;
}
exports.distance = distance;
