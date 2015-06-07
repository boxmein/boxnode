
exports.type = 'command';

var Q = require('q');
var logger = new require('../toplog')({concern: 'tpt', loglevel: 'VERBOSE'});

var NUMBER = /^\d+$/;
var USERNAME = /^[A-Za-z0-9_-]{3,16}$/;

var http = require('http');
var nodeutil = require('util');

var profileString = 'User %s (ID %d) - Age %s, Location %s, Site %s; %d saves (average score %s, highest %s); %d reputation, %d threads and %d posts.';
var saveString = 'Save "%s" (by %s) - Score %d (\x033 %d \x03-\x034 %d \x03), %d views, %d comments, Version #%d, Created %s, Last updated %s. http://tpt.io/~%d';
var detailedSaveString = 'Save "%s" (by %s) - Score %d (%d-%d), Views %d, Created %s, Modified %s, Comment# %d, Published? %s, Tags [%s], TPTVersion %s, Options (%s), Sign# %d';
exports.getHelp = function() {
  return {
    '*': '`tpt` - various powdertoy related commands. Try `list tpt`.',
    'profile': '`tpt.profile <username|ID>` - get data on a TPT user',
    'download': '`tpt.download <type> <platform>` - get the download link for some TPT (use `tpt.download list` to see all types)',
    'tptnet-profile': '`tpt.tptnet-profile <username|ID>` - get data on a TPT user on thepowdertoy.net',
    'save': '`tpt.save <ID>` - view basic details about a TPT save',
    'save-tptnet': '`tpt.save-tptnet <ID>` - view basic details about a TPTNet save',
    'save-detailed': '`tpt.save-details <ID>` - view a lot of details about a TPT save'
  };
};

exports.listAll = function() {
  return Object.keys(exports.getHelp());
};

exports.listener = function(line, words, respond, util) {
  var evt = this.event.slice(4);

  if (evt == 'profile' || evt == 'tptnet-profile') {

    var url;

    if (evt == 'tptnet-profile') {
      url = util.config.get('modules.tpt.endpoint.tptnet');
    }
    else {
      url = util.config.get('modules.tpt.endpoint.official');
    }

    logger.verbose('looking up profile: event ' + this.event);
    var id = words[1];

    getProfileData(id, url).then(function(data) {

      if (!(data && data.User && data.User.Saves && data.User.Forum)) {
        if (!data) {
          logger.debug('data is falsey');
        } else if (!data.User) {
          logger.debug('data.User is falsey');
        } else {
          logger.debug(data.User.Saves, data.User.Forum);
        }

        logger.verbose(data);
        return respond('Weird JSON response :(');
      }

      var endstr = nodeutil.format(profileString, data.User.Username,
        data.User.ID, data.User.Age,
        (data.User.Location || '(none)').slice(0, 30),
        (data.User.Website || '(none)').slice(0, 30),
        data.User.Saves.Count, data.User.Saves.AverageScore,
        data.User.Saves.HighestScore, data.User.Forum.Reputation,
        data.User.Forum.Topics, data.User.Forum.Replies);

      endstr = superStrip(endstr);

      respond(endstr);
    }, function(err) {
      logger.debug('Could not look up the profile:', err);
    });
  }

  else if (evt == 'download') {

    var dls = util.config.get('modules.tpt.downloads');

    if (words[1] == 'list') {
      var res = '';
      for (var k in dls) {
        res += k + ' (';

        res += Object.keys(dls[k]).join(', ');
        res += '), ';
      }
      res = res.slice(0, -2);
      return respond(res);
    }

    if (words[1] && words[2]) {
      if (dls.hasOwnProperty(words[1])) {
        if (dls[words[1]].hasOwnProperty(words[2])) {
          return respond(dls[words[1]][words[2]]);
        } else {
          return respond('no such platform known! try `tpt.download list` - the platforms are the things inside the parentheses');
        }
      } else {
        return respond('I don\'t know of that kind of TPT! try `tpt.download list` the kinds are the things in front of the parentheses');
      }
    }
  }

  else if (evt == 'save' || evt == 'save-tptnet') {
    if (evt == 'save') {
      var endpoint = util.config.get('modules.tpt.endpoint.official');
    } else {
      var endpoint = util.config.get('modules.tpt.endpoint.tptnet');
    }
    getSaveData(words[1], endpoint).then(function(data) {
      if (!data) {
        logger.error('getSaveData succeeded but data was falsey');
        return;
      }

      if (data.ID == 404) {
        logger.debug('SaveID 404, no save found!');
        respond('404\'d!');
        return;
      }

      var dc = new Date(data.DateCreated * 1000);
      var dm = new Date(data.Date * 1000);
      var endstr = nodeutil.format(saveString, data.ShortName, data.Username,
        data.Score, data.ScoreUp, data.ScoreDown, data.Views, data.Comments,
        data.Version, shortNeatDate(dc), shortNeatDate(dm), data.ID);

      endstr = superStrip(endstr);

      respond(endstr);

    }, function(err) {
      logger.error('error getting save data:', err);
      logger.verbose('stack trace:', err.stack);
    });
  }

  else if (evt == 'save-detailed') {
    getDetailedSaveData(words[1]).then(function(data) {
      if (!data) {
        logger.error('data was falsey, wat');
        return;
      }

      logger.verbose(data.Options);

      var enabledOpts = [];
      for (var k in data.Options) {
        if (data.Options[k]) {
          enabledOpts.push(k);
        }
      }

      var endstr = nodeutil.format(detailedSaveString,
        data.Name, data.Username, data.Score, data.ScoreUp, data.ScoreDown,
        data.Views, shortNeatDate(new Date(data.DateCreated * 1000)),
        shortNeatDate(new Date(data.Date * 1000)), data.Comments,
        data.Published ? 'true' : 'false', data.Tags.join(',') || '(none)',
        data.PowderVersion, enabledOpts.join(',') || '(none)',
        data.Signs.length);

      endstr = superStrip(endstr);

      respond(endstr);

      respond('Description: ' + superStrip(data.Description));

    }, function(err) {
      logger.error('error getting detailed(TM) save data:', err);
      logger.verbose('stack trace: ', err.stack);
    });
  }
};

exports.init = function(util, alias) {
  alias('profile', 'tpt.profile');
  alias('profile1', 'tpt.tptnet-profile');
  alias('saveid', 'tpt.save');
  alias('~', 'tpt.save');
};

// Date -> "YYYY-MM-DD HH:MM:SS"
function shortNeatDate(date) {
  return date.getFullYear()+ '-' + padLeft(date.getMonth() + 1,2) +
         '-' + padLeft(date.getDate(),2) + ' ' +
         padLeft(date.getHours(),2) + ':' + padLeft(date.getMinutes(),2) + ':' +
         padLeft(date.getHours(),2);
}


// Get detailed JSON for a particular save.
function getDetailedSaveData(saveid) {
  var deferred = Q.defer();
  if (!NUMBER.test(saveid)) {
    deferred.reject('save ID not a number!');
    return deferred.promise;
  }

  getJSON('http://powdertoythings.co.uk/Powder/Saves/ViewDetailed.json?ID=' +
    saveid).then(deferred.resolve, deferred.reject);

  return deferred.promise;
}


// Get the JSON for a particular save.
function getSaveData(saveid, url) {
  var deferred = Q.defer();

  if (!NUMBER.test(saveid)) {
    deferred.reject('save ID not a number');
    return deferred.promise;
  }

  url += '/Browse/View.json?ID=' + saveid;

  getJSON(url).then(deferred.resolve, deferred.reject);

  return deferred.promise;
}


// Return profile data for a given user.
// @param user {String} an user for whom to return profile data
// @param url {String} the endpoint (eg http://powdertoy.co.uk) to query
// @returns {Deferred<object>} the JSON response from the API
function getProfileData(user, url) {
  var deferred = Q.defer();

  url += '/User.json';

  if (!user) {
    deferred.reject('no ID given!');
  }

  if (NUMBER.test(user)) {
    user = parseInt(user, 10);
    if (isNaN(user)) {
      deferred.reject(new Error('ID looked like a number but was actually NaN'));
    }
    url += '?ID=' + encodeURIComponent(user);

  } else if (USERNAME.test(user)) {

    url += '?Name=' + encodeURIComponent(user);

  } else {
    deferred.reject(new Error('Username / ID invalid!'));
    return deferred.promise;
  }

  getJSON(url).then(deferred.resolve, deferred.reject);

  return deferred.promise;
}

// Returns a response object given the JSON-returning URL to query.
// @param url {String} The URL to send a HTTP GET to
// @returns {Deferred<object>} The parsed JSON object
function getJSON(url) {
  logger.info('GET ' + url);
  var deferred = Q.defer();
  http.get(url, function(response) {
    var glorp = '';
    response.setEncoding('UTF-8');

    response.on('data', function(chunk) {
      glorp += chunk;
    });

    response.on('end', function() {
      try {
        var data = JSON.parse(glorp);
        deferred.resolve(data);
      } catch (err) {
        deferred.reject(err);
      }
    });
    response.on('error', deferred.reject);
  }).on('error', deferred.reject);
  return deferred.promise;
}

// Pad a string on the left to #{length} length.
// @param str {String} The string to pad
// @param len {Number} the amount of zeros to add
// @returns a string of length #{length} with zeros added to the left
function padLeft(str, len) {
  var zeros = '0';

  for (var i = 0; i < len; i++) {
    zeros += '0';
  }

  if (typeof str !== 'string') str = ''+str;

  return (zeros + str).slice(-len);
}

// Remove all non-printable ASCII characters from the input.
function superStrip(str) {
  var newstr = '';
  for (var i=0;i<str.length;i++) {
    var ccode = str.charCodeAt(i);

    if (ccode >= 0x20 && ccode <= 0x7e) {
      newstr += str[i];
    } else {
      newstr += '_';
    }
  }

  return newstr;
}
