
exports.type = 'command';

var Q = require('q');
var logger = new require('toplog')({concern: 'tpt', loglevel: 'VERBOSE'});
var tinystore = require('tinystore');

var http = require('http');
var nodeutil = require('util');

var NUMBER = /^\d+$/;
var USERNAME = /^[A-Za-z0-9_-]{3,16}$/;

// this is assigned to
// util.config.get('modules.tpt.sessionstore_key')
var dataStoreKey = null;
// this is assigned to 'util' as passed by init
var util = null;
// tpt.x == listeners.x
var listeners = {};

exports.getHelp = function() {
  return {
    '*': '`tpt` - various powdertoy related commands. Try `list tpt`.',
    'profile': '`tpt.profile <username|ID>` - get data on a TPT user',
    'download': '`tpt.download <type> <platform>` - get the download link for some TPT (use `tpt.download list` to see all types)',
    'profile-tptnet': '`tpt.profile-tptnet <username|ID>` - get data on a TPT user on thepowdertoy.net',
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

  if (listeners.hasOwnProperty(evt)) {
    listeners[evt](evt, line, words, respond, util);
  }
};


exports.init = function(u, alias) {
  alias('profile', 'tpt.profile');
  alias('profile1', 'tpt.tptnet-profile');
  alias('saveid', 'tpt.save');
  alias('~', 'tpt.save');

  dataStoreKey = u.config.get('modules.tpt.sessionstore_key');
  util = u;
};





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

  util.getJSON(url).then(deferred.resolve, deferred.reject);

  return deferred.promise;
}

var profileString = 'User %s (ID %d) - Age %s, Location %s, Site %s; %d saves \
(average score %s, highest %s); %d reputation, %d threads and %d posts.';

listeners['profile'] =
listeners['profile-tptnet'] = function(evt, line, words, respond, util) {
  var url;

  if (evt == 'profile-tptnet') {
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

    endstr = util.superStrip(endstr);

    respond(endstr);
  }, function(err) {
    logger.debug('Could not look up the profile:', err);
  });
};






listeners['download'] = function(evt, line, words, respond, util) {
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
};





// Get the JSON for a particular save.
function getSaveData(saveid, url) {
  var deferred = Q.defer();

  if (!NUMBER.test(saveid)) {
    deferred.reject('save ID not a number');
    return deferred.promise;
  }

  url += '/Browse/View.json?ID=' + saveid;

  util.getJSON(url).then(deferred.resolve, deferred.reject);

  return deferred.promise;
}

var saveString = 'Save "%s" (by %s) - Score %d (\x033 %d \x03-\x034 %d \x03), \
%d views, %d comments, Version #%d, Created %s, Last updated %s. \
http://tpt.io/~%d';

listeners['save'] =
listeners['save-tptnet'] = function(evt, line, words, respond, util) {
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

    endstr = util.superStrip(endstr);

    respond(endstr);

  }, function(err) {
    logger.error('error getting save data:', err);
    logger.verbose('stack trace:', err.stack);
  });
};






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

var detailedSaveString = 'Save "%s" (by %s) - Score %d (%d-%d), Views %d, \
Created %s, Modified %s, Comment# %d, Published? %s, Tags [%s], TPTVersion \
%s, Options (%s), Sign# %d';

listeners['save-detailed'] = function(evt, line, words, respond, util) {
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

    endstr = util.superStrip(endstr);

    respond(endstr);

    respond('Description: ' + util.superStrip(data.Description));

  }, function(err) {
    logger.error('error getting detailed(TM) save data:', err);
    logger.verbose('stack trace: ', err.stack);
  });
};


listeners['get-session'] = function(evt, line, words, respond, util) {
  getSessionKey(words[1]).then(function(key) {
    logger.verbose('got key!');
    respond(key);
  }, function(err) {
    logger.error(err);
    logger.verbose(err.stack);
    respond('failed to get key!');
  });
};

listeners['set-session'] = function(evt, line, words, respond, util) {
  setSessionKey(words[1], words[2]).then(function() {
    respond('success!');
  }, function(err) {
    logger.error(err);
    logger.verbose(err.stack);
    respond('failure!');
  });
}


function loadSessionData() {
  return tinystore.load('tpt-sessions.datastore', dataStoreKey);
}

function getSessionKey(name) {
  var def = Q.defer();
  loadSessionData().then(function(data) {
    if (!data || !data.keys)
      return def.reject(new Error('empty data / no keys!'));
    def.resolve(data.keys[name]);
  }, def.reject);
  return def.promise;
}

function setSessionKey(name, key) {
  return loadSessionData().then(function(data) {
    if (!data || !data.keys) {
      data = data || {};
      data.keys = {};
    }

    data.keys[name] = key;

    try {
      tinystore.save(data, 'tpt-sessions.datastore', dataStoreKey);
    } catch (err) {
      return err;
    }
  });
}



// Date -> "YYYY-MM-DD HH:MM:SS"
function shortNeatDate(date) {
  return date.getFullYear()+ '-' +
         util.padLeft(date.getMonth() + 1,2) + '-' +
         util.padLeft(date.getDate(),2) + ' ' +
         util.padLeft(date.getHours(),2) + ':' +
         util.padLeft(date.getMinutes(),2) + ':' +
         util.padLeft(date.getHours(),2);
}

