/*
  Benedict Cumberbatch Name Generator
  The data is humbly stolen from http://benedictcumberbatchgenerator.tumblr.com/

  ~boxmein
*/

var _ = require('underscore');
exports.type = 'command';

exports.listAll = function() {
  return ['*'];
};

exports.getHelp = function() {
  return {
    '*': '`benedict` - generate a name for ' + generateName()
  };
};

exports.listener = function(line, words, respond) {
  respond(generateName());
};

function generateName() {
  if (Math.random() < 0.1) {
    return _.sample(fullnamelist);
  } else {
    return _.sample(firstnamelist) + ' ' + _.sample(lastnamelist);
  }
}


// Humbly stolen from http://benedictcumberbatchgenerator.tumblr.com/
var firstnamelist = ["Bumblebee", "Bandersnatch", "Broccoli", "Rinkydink",
    "Bombadil", "Boilerdang", "Bandicoot", "Fragglerock", "Muffintop",
    "Congleton", "Blubberdick", "Buffalo", "Benadryl", "Butterfree",
    "Burberry", "Whippersnatch", "Buttermilk", "Beezlebub", "Budapest",
    "Boilerdang", "Blubberwhale", "Bumberstump", "Bulbasaur", "Cogglesnatch",
    "Liverswort", "Bodybuild", "Johnnycash", "Bendydick", "Burgerking",
    "Bonaparte", "Bunsenburner", "Billiardball", "Bukkake", "Baseballmitt",
    "Blubberbutt", "Baseballbat", "Rumblesack", "Barister", "Danglerack",
    "Rinkydink", "Bombadil", "Honkytonk", "Billyray", "Bumbleshack",
    "Snorkeldink", "Anglerfish", "Beetlejuice", "Bedlington", "Bandicoot",
    "Boobytrap", "Blenderdick", "Bentobox", "Anallube", "Pallettown",
    "Wimbledon", "Buttercup", "Blasphemy", "Syphilis", "Snorkeldink",
    "Brandenburg", "Barbituate", "Snozzlebert", "Tiddleywomp", "Bouillabaisse",
    "Wellington", "Benetton", "Bendandsnap", "Timothy", "Brewery", "Bentobox",
    "Brandybuck", "Benjamin", "Buckminster", "Bourgeoisie", "Bakery",
    "Oscarbait", "Buckyball", "Bourgeoisie", "Burlington", "Buckingham",
    "Barnoldswick"];

var lastnamelist = ["Coddleswort", "Crumplesack", "Curdlesnoot", "Calldispatch",
  "Humperdinck", "Rivendell", "Cuttlefish", "Lingerie", "Vegemite", "Ampersand",
  "Cumberbund", "Candycrush", "Clombyclomp", "Cragglethatch", "Nottinghill",
  "Cabbagepatch", "Camouflage","Creamsicle", "Curdlemilk", "Upperclass",
  "Frumblesnatch", "Crumplehorn", "Talisman", "Candlestick", "Chesterfield",
  "Bumbersplat", "Scratchnsniff", "Snugglesnatch", "Charizard", "Carrotstick",
  "Cumbercooch", "Crackerjack", "Crucifix", "Cuckatoo", "Cockletit", "Collywog",
  "Capncrunch", "Covergirl", "Cumbersnatch", "Countryside","Coggleswort",
  "Splishnsplash", "Copperwire", "Animorph", "Curdledmilk", "Cheddarcheese",
  "Cottagecheese", "Crumplehorn", "Snickersbar", "Banglesnatch", "Stinkyrash",
  "Cameltoe", "Chickenbroth", "Concubine", "Candygram", "Moldyspore",
  "Chuckecheese", "Cankersore", "Crimpysnitch", "Wafflesmack", "Chowderpants",
  "Toodlesnoot", "Clavichord", "Cuckooclock", "Oxfordshire", "Cumbersome",
  "Chickenstrips", "Battleship", "Commonwealth", "Cunningsnatch", "Custardbath",
  "Kryptonite", "Curdlesnoot", "Cummerbund", "Coochyrash", "Crackerdong",
  "Crackerdong", "Curdledong", "Crackersprout", "Crumplebutt", "Colonist",
  "Coochierash"];

var fullnamelist = ["Wimbledon Tennismatch", "Rinkydink Curdlesnoot",
  "Butawhiteboy Cantbekhan", "Benadryl Claritin", "Bombadil Rivendell",
  "Wanda's Crotchfruit", "Wanda's Crotchfruit", "Biblical Concubine",
  "Butawhiteboy Cantbekhan", "Syphilis Cankersore", "Butawhiteboy Cantbekhan",
  "Benedict Timothy Carlton Cumberbatch", "Wanda's Son",
  "Buckminster Fullerene", "Bourgeoisie Capitalist"];


