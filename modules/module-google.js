// Google module - will expire quickly.
var nodeutil = require('util');
var querystring = require('querystring');
var _ = require('underscore');

var logger = new require('toplog')({concern: 'google', loglevel: 'VERBOSE'});
exports.type = 'command';

exports.listAll = function() {
  return Object.keys(exports.getHelp());
};

exports.getHelp = function() {
  return {
    '*': '`google <query>` - (Deprecated) Searches Google'
  };
};


exports.listener = function(line, words, respond, util) {

  var text = util.trim(words.slice(1).join(' '));
  logger.verbose('searching for ', text);

  logger.info('GET http://ajax.googleapis.com/ajax/services/search/web' +
    querystring.stringify({
      'v': '1.0',
      'q': text
    }));
  util.getJSON('http://ajax.googleapis.com/ajax/services/search/web?' +
                querystring.stringify({
                  'v': '1.0',
                  'q': text
                })).then(function(data) {

    logger.verbose('Results are back!', data);

    if (data.responseData && data.responseData.results) {

      if (data.responseData.results.length == 0) {
        respond('No results');
      } else {
        logger.verbose('we have some results, constructing text');
        var endstr = _.reduce(data.responseData.results.slice(0, 3), function(acc, each) {
          logger.verbose()
          return acc + ' / \x03' + each.titleNoFormatting + '\x03 (' + each.url + ')';
        }, '>>');
        respond(endstr);
      }

    } else {
      logger.debug('no `data.responseData.results`!', data);
    }

  }, function(err) {
    logger.error(err);
    respond('Failed to get search results: ' + err.message);
  });
};

var DEPRECATED = 'This uses an old weird Google search API that\'s '+
  'completely deprecated. This module may stop working at any time and might ' +
  'flag your computer to Google as a robot. I don\'t know.';
exports.init = function(util, addAlias) {
  addAlias('gg', 'google');
  logger.warning(DEPRECATED);
};
