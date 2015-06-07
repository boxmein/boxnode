// Dead simple compressed and encrypted datastore
var crypto = require('crypto');
var zlib   = require('zlib');
var fs     = require('fs');
var stream = require('stream');
var logger = new require('../toplog')({concern: 'tinystore'});

// Load the session store from #{filename} and decrypt it using #{method} with
// the key #{key}.
// @param filename {String} filename
// @param key the encryption key, can be a string or buffer
// @param method (default = "aes-256-cbc") the encryption method to use
// @returns {Stream} a stream containing your JSON data
module.exports.load = function(filename, key, method) {
  logger.debug('loading datastore from file ' + filename);
  logger.verbose('the key is ' + key);

  method = method || 'aes-256-cbc';

  try {
    var decipher = crypto.createDecipher(method, key);
    var file = fs.createReadStream(filename);
    var unpack = zlib.createGunzip();

    return file.pipe(unpack).pipe(decipher);
  } catch (err) {
    // like, soft error handling
    return err;
  }
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

    return s.pipe(cipher).pipe(pack).pipe(file);
  } catch (err) {
    // more soft error handling
    return err;
  }
};
