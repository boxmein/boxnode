/*
  module-logging.js
  This is an example of an 'event'-type module.
  This module gets access to the global configuration and all event streams, so
  you can do pretty much anything with those event streams, including injecting
  your own events.
*/
exports.type = 'event';

var https = require('https')
  , toplog = require('toplog')
  , querystring = require('querystring')
  , logger = new toplog({
    concern: 'youtube',
    loglevel: 'INFO'
});

var YT_URL = /^https?:\/\/(www\.)?youtu(be\.com|\.be)\/(watch)?/;
var YT_ID = /((\?|&)v=|\/v\/)([a-zA-Z0-9_-]{11})/;
var ISO8601PT = /^PT((\d+)H)?(\d+)M(\d+)S$/;

function humanReadableDuration(text) {
  var asdf = text.match(ISO8601PT);
  var al = asdf.length;

  var as = asdf[al-1];
  var am = asdf[al-2];
  var ah = asdf[al-3] || undefined;
  logger.debug('matching duration: ' + asdf);
  return ah ? ah + ':' : '' + am + ':' + as;
}

exports.init = function(app, irc, command, util) {


  if (!util.config.get('modules.yt') ||
      !util.config.get('modules.yt.api_key')) {

    logger.error('no Youtube API key found -- not hooking!');

    if (util.config.get('modules.yt')) {
      logger.debug('myconfig.api_key: ' + util.config.get('modules.yt.api_key'));
    }

    return false;

  }

  irc.onAny(function(ircline) {
    if (ircline.command == 'PRIVMSG') {

      // Whitelisted channels only!
      if (util.config.get('modules.yt.whitelist', false) &&
          util.config.get('modules.yt.channel_whitelist'[])
            .indexOf(ircline.channel) === -1) {
        return;
      }

      logger.verbose('matching youtube URLs in the message');
      if (ircline.params[1].match(YT_URL)) {

        var ytmatch = ircline.params[1].match(YT_ID);
        var ytid = ytmatch[ytmatch.length - 1]; // the last element is the YT ID

        logger.info('found a youtube URL, fetching metadata for id ' + ytid);

        var url = '/youtube/v3/videos/?' + querystring.stringify({
          'id': ytid,
          'part': 'snippet,contentDetails',
          'key': util.config.get('modules.yt.api_key')
        });

        logger.verbose('GET https://www.googleapis.com' + url);

        https.get({
          method: 'GET',
          host: 'www.googleapis.com',
          path: url,
          headers: util.config.get('modules.yt.headers', {
            'User-Agent': 'irc bot boxnode (node-irc-bot-3) module-yt.js http://boxmein.net'
          })
        }, function(res) {
          logger.verbose('got a response from googleapis');

          var glorp = '';

          res.setEncoding('UTF-8');
          res.on('data', function(chunk) { glorp += chunk; });

          res.on('end', function() {
            var data;

            if (glorp == 'Not Found') {
              logger.error('404\'d');
              return;
            }

            try {
              data = JSON.parse(glorp);
            } catch (err) {
              logger.error('error parsing youtube response: ' + err.message);
              logger.debug(err.stack);
              logger.verbose(glorp);
              return;
            }

            if (res.statusCode == 200) {
              var response = '';

              if (!(data.items && data.items[0])) {
                logger.error('response is missing first data item');
                return;
              }
              if (data.items[0].snippet) {
                var snip = data.items[0].snippet;
                response += '\x02'+snip.title.slice(0, 100) + '\x02 by ' +
                            snip.channelTitle;
              } else {
                logger.warning('response is missing data snippet');
              }

              response += ' ';

              if (data.items[0].contentDetails) {
                var cd = data.items[0].contentDetails;
                response += humanReadableDuration(cd.duration) + ' ' +
                            cd.definition.toUpperCase() + ' ' +
                            cd.licensedContent ? 'L' : '';

                if (cd.regionRestriction) {
                  response += ' \x035Allowed In Germany:\x03 ';
                  if (cd.regionRestriction.allowed.indexOf('DE') === -1) {
                    response += '\x02No\x02';
                  } else {
                    response += '\x02Yes\x02';
                  }
                }
              } else {
                logger.warning('response is missing content details');
              }

              util.respond.PRIVMSG(ircline.params[0], response);

            } else {
              if (data.errors && data.errors[0] && data.errors[0].reason) {
                logger.error(res.statusCode + ' -- ' + data.errors[0].reason);
              }
              else {
                logger.error('invalid error response -- ' + res.statusCode);
              }
            }
          });

        });

      } else {
        logger.verbose('no youtube URL found');
      }
    }
  });

  logger.info('initialized successfully!');
};
