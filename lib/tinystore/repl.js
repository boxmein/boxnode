var repl = require('repl');
var tinystore = require('./index.js');

function load(filename, key, method) {
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
    if (cmd == 'help') {
      console.log('tinystore.load(filename, key, method) -> readable stream');
      console.log('tinystore.save(data, filename, key, method) -> writable stream');
      console.log('load(filename, key, method) -> output');
    }
    try {
      var result = eval(cmd);
      callback(null, result);
    } catch (err) {
      callback(err);
    }
  }
});
