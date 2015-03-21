// Various euphemisms for beating the bishop
var _ = require('underscore');

exports.type = 'command';

// hint: you'll need some help after this module
exports.getHelp = function() {
  return {
    '*': '`euphemisms` - print an euphemism for \'masturbate\''
  };
};

exports.listener = function(line, words, respond) {
  respond(_.sample(euphemisms));
};

var euphemisms = ["beat the bishop","beat your little brother","beat the meat",
  "burp the worm","butter your corn","choke the chicken","clean your rifle",
  "consult Dr. Jerkoff","crank your shank","dink your slinky",
  "feel in your pocket for your big hairy rocket","file your fun-rod",
  "fist your mister","flex your sex","flog the dolphin","flog the log",
  "flog your dog","grease your pipe","hack your mack","hump your hose",
  "jerkin' the gherkin","milk the chicken","one-stick drum improvisation",
  "pack your palm","paint your ceiling",
  "play a flute solo on your meat whistle","play the male organ",
  "please your pisser","point your social finger","polish your rocket",
  "polish your sword","pound the pud","pound your flounder",
  "prompt your porpoise","prune the fifth limb","pull the pope",
  "pull your taffy","run your hand up the flagpole","shine your pole",
  "shoot the tadpoles","slakin' the bacon","slam your hammer",
  "slam your Spam","slap your wapper","spank the monkey","spank the salami",
  "strike the pink match","stroke the dog","stroke your poker",
  "talk with Rosy Palm and her five little sisters","tickle your pickle",
  "thump your pumper","tweak your twinkie","unclog the pipes",
  "varnish your pole","walk the dog","watch the eyelid movies",
  "wax your dolphin","whip your dripper","whizzin' jizzum",
  "wonk your conker","yang your wang","yank the yam", "yank your crank",
  "masturbate", "make the bald man cry"];
