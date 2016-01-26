exports.type = 'event';
var _ = require('underscore');
exports.init = function(app, irc, command, util) {

  var logger = new require('toplog')({
    concern: 'autohello',
    loglevel: 
      util.config.get('modules.autohello.loglevel', util.config.get('loglevel', 'INFO'))
  });

  logger.info("enabling automatic hello responses!");

  irc.on('PRIVMSG', function(line) {
    logger.verbose("caught a PRIVMSG, parsing for hellos");
    if (line.message.indexOf(util.config.get('nick', 'boxnode')) !== -1) {
      logger.verbose("it mentions our name! wonder if it has a hello word in it");

      var match_hellos = util.config.get('modules.autohello.match_words', ['hi']);
      var success_msg  = util.config.get('modules.autohello.message');
      var result_hellos = util.config.get('modules.autohello.hellos');
      
      logger.debug("we have this many hellos to detect: " + match_hellos.join(', ').slice(0, 100));
      logger.debug("we have this many hellos to use in responses: " + result_hellos.join(', ').slice(0, 100));
      logger.debug("when we find a hello, we use this pattern: " + success_msg);

      if (match_hellos.length > 0) {
        for (var i=0,mh=match_hellos;i<mh.length;i++) {
          if (line.message.indexOf(mh[i]) !== -1) {
            logger.verbose("just found a hello word too! going to respond to the user...");
            
            var message = success_msg.replace("%rand_hello", _.sample(result_hellos));
            message = message.replace("%nick", line.nick);

            logger.debug("responding to the user with message: " + message);
            util.respond.PRIVMSG(line.channel, message);
            break;
          }
        }
      }
    }
  });
};
