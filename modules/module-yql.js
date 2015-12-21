// module-yql.js: a Yahoo Query Language interface for the bot
// 

var logger = new require('toplog')({concern: 'yql', loglevel: 'DEBUG'});

var YQL = require('yql');
var querystring = require('querystring');
var Q = require('q');
var http = require('http');

exports.type = 'command';

exports.listAll = function() {
  return Object.keys(exports.getHelp());
};

exports.getHelp = function() {
  return {
    'yql': '`yql.yql <query...>` - send a YQL query and return the first response',
    'woeid': '`yql.woeid <place...>` - translate a placename (eg London, UK) into a yahoo location identifier',
    'weather': '`yql.weather <place...>` - show weather in a location (celsius units)',
    'weatherf': '`yql.weatherf <place...>` - show weather in a location (fahrenheit units)',
    'distance': '`yql.distance <place1>:<place2>` - show distance between two geographic locations (names separated by a colon)',
    'github': '`yql.github <user>/<repo> <property>` - show a property of the aforementioned github repo (eg `yql.github boxmein/qdb stargazers_count`)'
  };
};

var yql_handlers = {};

exports.listener = function(line, words, respond, util) {
  var subcmd = this.event.slice("yql.".length);
  
  function errify(err) {
    logger.error("YQL failed with error: " + err);
    respond("YQL failed with error: " + err);
  } 

  if (yql_handlers.hasOwnProperty(subcmd)) {
    yql_handlers[subcmd](line, words, respond, util, errify);
  }

  // Raw YQL
  if (util.config.get('modules.yahoo.raw_yql.enabled', false) &&
      subcmd == 'yql') {

    var allowed = false;

    // Check users for permissions
    if (util.config.get('modules.yahoo.raw_yql.owner_access', true) &&
        util.matchesHostname(util.config.get('owner'), line.hostmask)) {
      allowed = true;
    }

    else if (util.config.get('modules.yahoo.raw_yql.whitelist', false)) {
      var xs = util.config.get('modules.yahoo.raw_yql.list', []);
      for (var i = 0; i < xs.length; i++) {
        if (util.matchesHostname(xs[i], line.hostmask)) 
          allowed = true;
      }
    }

    if (!allowed) {
      respond('you\'re not allowed to use raw YQL!');
    } else {
      logger.info("Doing raw YQL for " + line.hostmask);

      yql(words.slice(1).join(' '))
      .then(function(res) {
        respond(JSON.stringify(res.query.results).slice(0, 200));
      }, errify);
    }
  }
};

yql_handlers.woeid = function(line, words, respond, util, errify) {
  yql('SELECT woeid FROM geo.places WHERE ( text = @t ) LIMIT 1', {
    t: words.slice(1).join(' ')
  }).then(function(res) {
    respond(res.query.results.place.woeid);
  }, errify);
};

yql_handlers.weather = function(line, words, respond, util, errify) {
  yql('SELECT * FROM weather.forecast WHERE u=\'c\' AND woeid IN ( SELECT woeid FROM geo.places WHERE (text = @t) LIMIT 1 );', {
    t: words.slice(1).join(' ')
  }).then(function(res) {
    respond(weather_format(res));
  }, errify);
};

yql_handlers.weatherf = function(line, words, respond, util, errify) {
  yql('SELECT * FROM weather.forecast WHERE woeid IN ( SELECT woeid FROM geo.places WHERE (text = @t) LIMIT 1 );', {
    t: words.slice(1).join(' ')
  }).then(function(res) {
    respond(weather_format(res));
  }, errify);
};

yql_handlers.distance = function(line, words, respond, util, errify) {
  var places = words.slice(1).join(' ').split(':');
  if (places.length != 2) {
    respond("you didn't have two places! separate their names via a colon (see `help yahoo.distance`)");
  } else {
    logger.debug('distance between: ', places[0], places[1]);
    yql('SELECT * FROM geo.distance WHERE place1="@p1" AND place2="@p2";', {
      p1: places[0],
      p2: places[1]
    }).then(function(res) {
      respond(res.distance.kilometers + "km / " + res.distance.miles + "mi");
    }, errify);
  }
};

yql_handlers.github = function(line, words, respond, util, errify) {
  
  var repo = words[1].split('/');
  var user = repo[0];
  repo = repo[1];

  var prop = words[2];

  yql('SELECT * FROM github.repo WHERE id=\'@user\' AND repo=\'@repo\'', {
    'user': user,
    'repo': repo
  }).then(function(res) {
    var lookup = res.query.results.json;
    if (lookup.hasOwnProperty(prop)) {
      respond(prop + ": " + lookup[prop]);
    } else {
      logger.error('YQL response did not show a response:');
      logger.error(lookup);
      logger.error('entire object:');
      logger.error(res);
      respond("did not find such a property: " + prop);
    }
  });
};


/**
 * Sends a YQL request and returns a Promise that resolves to the JSON data.
*/
function yql(query, params) {
  params = params || {};
  logger.info("YQL: " + query);

  var def = Q.defer();
  var query = new YQL(query);

  // All requests over SSL because we're paranoid
  query.setConfig('ssl', true);

  // Set parameters for the query
  for (var k in params) {
    query.setParam(k, params[k]);
  }

  // Done!
  query.exec(function(err, res) {
    if (err) return def.reject(err);
    else return def.resolve(res);
  });

  return def.promise;
}
