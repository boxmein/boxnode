/*
  Text-mangling module for this bot

  Partially based on the perl module Text::Bastardize v0.06 by
  Julian Fondren (1999). The module was licensed under the GPL.
*/

var _ = require('underscore');

exports.type = 'command';

// all manglers under here
var manglers = {};

exports.listAll = function() {
  return Object.keys(manglers);
};

exports.getHelp = function() {
  return {
    '*': ' `mangler.<type> <text...>` - mangle text using a specific algorithm',
    'rot13': '`mangler.rot13 <text..>` - ROT13 some text',
    'k3wlt0k': '`mangler.k3wlt0k <text...>` - kewltalk (try it!)',
    'reduct': '`mangler.reduct <text...>` - reduct a piece of text (rmvng vcls, etc)',
    'reverse': '`mangler.reverse <text...>` - sseug yam uoy sa ,txet sesrever siht',
    'n20e': '`mangler.n20e <text...>` - numericalize words (eg internationalization -> i18n)',
    'gnu': '`mangler.gnu <text...>` - GNU/adds GNU/GNU GNU/to GNU/everything',
    'aol': '`mangler.aol <text...>` - replicates AIM messages well<3<3<3',
    'uppercase': '`mangler.uppercase <text...>` - LOUDLY YELLING',
    'titlecase': '`mangler.titlecase <text...>` - Title Case Is Too Proper',
    'lowercase': '`mangler.lowercase <text...>` - lowercase is best case',
    'leetspeak': '`mangler.leetspeak <text...>` - WR1T35 3V3RYTH1N6 1N L33T5P34K',
    'sort': '`mangler.sort <text...>` - sort each character',
    'shuffle': '`mangler.shuffle <text...>` - LOUDLY YELLING',
    'letterfreqs': '`mangler.letterfreqs <text...>` - compute letter frequencies of the text',
    'flip': '`mangler.flip <text...>` - flips the text vertically',
    'fliprev': '`mangler.fliprev <text...>` - flips the text vertically /AND/ horizontally',
    'compress': '`mangler.compress <text...>` - compressesthetextbyremovingallunnecessaryspace',
    'hash': '`mangler.hash <type> <text...>` - digest the given text using a hash algorithm (openssl)',
    'encipher': '`mangler.encipher <type> <password> <text...>` - encipher the given text',
    'decipher': '`mangler.decipher <type> <password> <hex digest...>` - decipher the given hex digest',
  };
};



exports.listener = function(line, words, respond) {
  var ev = this.event.split('.');

  if (ev.length < 2) {
    respond('you didn\'t specify a mangling type! see `help mangler` and `list mangler`');
    return;
  }

  if (manglers.hasOwnProperty(ev[1])) {
    respond(manglers[ev[1]](words.slice(1).join(' ')));
  }
};



exports.init = function(config, myconfig, alias) {};



// https://stackoverflow.com/a/617685/2278637
manglers.rot13 = function(s) {
  return s.replace(/[a-zA-Z]/g, function(c){
    return String.fromCharCode((c<="Z"?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26);
  });
};




// Text::Bastardize
manglers.k3wlt0k = function(text) {
  // okay left-to-right replacements then
  text = text.toLowerCase()
             .replace(/\bth/g, 'd')
             .replace(/ck\b/g, 'x0r')
             .replace(/cking\b/g, 'x0ring')
             .replace(/cked\b/g, 'x0red')
             .replace(/cker/g, 'x0r')
             .replace(/ing/g, 'in')
             .replace(/cause/g, 'cus')
             .replace(/fu/g, 'f00')
             .replace(/word/g, 'werd')
             .replace(/oo/g, 'ew')
             .replace(/for/g, '4')
             .replace(/ate/g, '8')
             .replace(/uaes itz clo/g, 'v34z 17z s10')
             .replace(/\'/g, '')
             .replace(/\./g, '...')
             .replace(/!/g, '!!!')
             .replace(/\?/g, '???')
             .replace(/\bc/g, 'k')
             .replace(/\b00/g, 'o0')
             .replace(/0rk/g, 'r0k')
             .replace(/y0v/g, 'j00')
             .replace(/[ck]001/g, 'k3wl')
             .replace(/741k/g, 't0k')
             .replace(/j00\B/g, 'j3r')
             .replace(/3z/g, 'z3')
             .replace(/3r/g, 'ur')
             .toUpperCase();
  return text;
}



// Text::Bastardize
manglers.reduct = function(text) {
  return text.toLowerCase()
             .replace(/!#\.,\?'";/g,'')
             .replace(/of/g,'uv')
             .replace(/one/g,'1')
             .replace(/\b(?:a|e)/g,'')
             .replace(/a?n?ks/g,'x')
             .replace(/you/g,'u')
             .replace(/are/g,'r')
             .replace(/you'?re?/g,'ur')
             .replace(/\B(?:a|e|i|o|u)\B/g,'');
};



// ... I don't think there is an origin
manglers.reverse = function(text) {
  return text.split('').reverse().join('');
};



// Text::Bastardize
manglers.n20e = function(text) {
  var start = text[0];
  var end = text[text.length -1];
  var n = text.length - 2;
  return start + n + end;
};



manglers.gnu = function(text) {
  return 'GNU/' + text;
};



manglers.aol = function(text) {
  var addition = _.sample([
    '<3', ':D', '~', '!', '.', ':)', ';)', ':-)', ':^)', ':^y'
  ]);

  return text + addition + addition + addition;
};



manglers.uppercase = function(text) {
  return text.toUpperCase();
};




manglers.titlecase = function(text) {
  return text.split(' ').map(function(ea) {
    return ea[0].toUpperCase() + ea.slice(1);
  });
};




manglers.lowercase = function(text) {
  return text.toLowerCase();
};




manglers.compress = function(text) {
  return text.split(' ').join('');
};



manglers.leetspeak = function(text) {
  return text.toUpperCase()
             .replace(/O/g, '0')
             .replace(/I/g, '1')
             .replace(/Z/g, '2')
             .replace(/E/g, '3')
             .replace(/A/g, '4')
             .replace(/S/g, '5')
             .replace(/G/g, '6')
             .replace(/B/g, '8');
};




manglers.sort = function(text) {
  return _.sortBy(text, function(ea) { return ea.charCodeAt(0); }).join('');
};

manglers.shuffle = function(text) {
  return _.shuffle(text).join('');
};

var FLIP_TABLE = 'z\u028ex\u028d\u028cn\u0287s\u0279bdou\u026f\u05df\u029e\u0638\u0131\u0265b\u025f\u01ddp\u0254q\u0250';
manglers.flip = function(text) {

};
