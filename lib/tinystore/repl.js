var repl = require('repl');
var tinystore = require('./index.js');

function load(filename, key, method) {
  tinystore.load(filename, key, method).then(function(data) {
    console.log('success: ', data);
  }, function(err) {
    console.log('error: ', err);
  });
}

function edit(filename, newdata, key, method) {
  var s = tinystore.load(filename, key, method);
  bufs = [];

  s.on('data', function(chunk) { bufs.push(chunk); });
  s.on('end', function() {
    var buf = Buffer.concat(bufs);
    console.log('total buffer:', buf);

    var str = buf.toString('utf8');
    console.log('string data:', str);

    var json = JSON.parse(str);
    console.log('JSON data', json);

    for (var k in newdata) {
      json[k] = newdata[k];
    }
    console.log('edited JSON data', json);

    tinystore.save(json, filename, key);
  });
}

repl.start({
  prompt: 'tinystore> ',
  eval: function(cmd, context, filename, callback) {
    try {
      var result = eval(cmd);
      callback(null, result);
    } catch (err) {
      callback(err);
    }
  }
});
