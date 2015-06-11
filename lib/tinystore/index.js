// Dead simple compressed and encrypted datastore
var crypto = require('crypto');
var zlib   = require('zlib');
var fs     = require('fs');
var stream = require('stream');
var logger = new require('../toplog')({concern: 'tinystore'});

var Q      = require('q');

// Load the session store from #{filename} and decrypt it using #{method} with
// the key #{key}.
// @param filename {String} filename
// @param key the encryption key, can be a string or buffer
// @param method (default = "aes-256-cbc") the encryption method to use
// @returns {Object} the JSON data as an object.
module.exports.load = function(filename, key, method) {
  var def = Q.defer();

  logger.debug('loading datastore from file ' + filename);
  logger.verbose('the key is ' + key);

  method = method || 'aes-256-cbc';

  var decipher = crypto.createDecipher(method, key);
  var unpack = zlib.createGunzip();
  var file = fs.createReadStream(filename);

  if (!file) {
    logger.verbose('tried to read-stream the file, but it was undefined');
    def.reject(new Error('file read stream was undefined'));
    return def.promise;
  }

  var reject = def.reject.bind(def);

  file.on('error', reject);
  unpack.on('error', reject);
  decipher.on('error', reject);

  var ends = file.pipe(unpack).pipe(decipher);

  var bufs = [];

  s.on('error', reject);
  s.on('data', function(chunk) { bufs.push(chunk); });

  s.on('end', function() {
    try {
      var buf = Buffer.concat(bufs);
      var str = buf.toString('utf8');
      var json = JSON.parse(str);
      logger.verbose('JSON data', json);

      def.resolve(json);
    } catch (err) {
      def.reject(err);
    }
  });

  return def.promise;
};

// Save the given data into filename and encrypt / compress it.
// @param data {Object} JSON-serializable data
// @param filename {String} filename
// @param key the encryption key, can be a string or buffer
// @param method (default = "aes-256-cbc") the encryption method to use
// @returns {Writable Stream} the file stream
module.exports.save = function(data, filename, key, method) {
  logger.debug('saving data to file', file);
  logger.verbose('data is', data);
  logger.verbose('key is', key);

  method = method || 'aes-256-cbc';

  try {
    var cipher = crypto.createCipher(method, key);
    var file = fs.createWriteStream(filename);
    var pack = zlib.createGzip();
    var s = new stream.Readable();

    data = JSON.stringify(data);

    s.push(data);
    s.push(null);

    s.pipe(cipher).pipe(pack).pipe(file);
    return true;
  } catch (err) {
    // more soft error handling
    return err;
  }
};
