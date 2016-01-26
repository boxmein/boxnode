
var logger;
var nodeutil = require('util');

exports.type = 'command';

exports.listAll = function() {
  return Object.keys(exports.getHelp());
};

exports.init = function(u) {
  logger = new require('toplog')({
    concern: 'convert',
    loglevel: u.config.get('modules.convert.loglevel', u.config.get('loglevel', 'INFO'))
  });
};

exports.getHelp = function() {
  return {
    '*': '`convert <amount> <unit1> to <unit2>` - unit conversions! SI prefixes have to be separated by dashes because I am literally Hitler',
    'list': '`convert.list [type]` - list all of the units I support in a given category, or all the categories I know of'
  };
};

var conversionRx = /([0-9.]+) ([a-z_-]+) (to|\->) ([a-z_-]+)/i;

exports.listener = function(line, words, respond, util) {

  var evt = this.event.slice(8);

  if (evt == 'list') {

    if (words[1]) {
      if (conversions.hasOwnProperty(words[1])) {
        respond(Object.keys(conversions[words[1]]).join(', '));
      } else {
        logger.debug('No such category: ' + words[1]);
        respond('No such category!');
      }
    }

    else {
      respond(Object.keys(conversions).join(', '));
    }
    return;
  }

  logger.debug('running conversions!');

  var lin = words.slice(1).join(' ').toLowerCase();
  var data = lin.match(conversionRx);

  if (data) {
    logger.verbose('successfully parsed conversion');

    var amount = data[1];
    var unit1  = data[2];
    // data[3] = "to" or "->"
    var unit2  = data[4];

    amount = parseFloat(data[1], 10);

    if (isNaN(amount)) {
      logger.error('amount was NaN');
      return respond('the amount was not a number!');
    }

    try {
      logger.verbose('trying to convert', unit1, unit2, amount);
      respond(genericConvert(unit1, unit2, amount));
    } catch (err) {
      if (err instanceof ConvertError) {
        logger.error(err, err.stack);
        respond('Error: ' + err.message);
      } else {
        throw err;
      }
    }
  } else {
    logger.verbose('regex didn\'t match - data =', data);
    respond('Try `help convert` for the correct format!');
  }
};

// Guess which category an unit belongs to
function guessCategory(unit) {
  if (unit.indexOf('-') !== -1) unit = unit.split('-')[1];

  // O(n)
  for (var k in normalizations) {
    if (normalizations[k].hasOwnProperty(unit)) {
      return k;
    }
  }

  // O(n^2)
  for (var k in conversions) {
    if (conversions[k].hasOwnProperty(unit)) {
      return k;
    }

    for (var l in conversions[k]) {
      if (conversions[k][l].hasOwnProperty(unit)) {
        return k;
      }
    }
  }
}

// Normalize an unit's name to what's in the table
function normalizeUnit(category, unit) {

  if (normalizations[category] && normalizations[category].hasOwnProperty(unit))
    return normalizations[category][unit];
  else
    return unit;
}

// convert SI prefixes
function siPrefix(prefix) {

  if (conversions.SI.hasOwnProperty(prefix)) {
    var offset = conversions.SI[prefix];
    return offset;
  } else {
    throw new ConvertError('no such SI prefix: ' + prefix);
  }
}

// Return the multiplier between two units
function unitConversions(category, from, to) {

  var conv = conversions[category];
  if (!conv) {
    logger.error('unit category ' + category + ' does not exist!');
    return;
  }

  // Might happen if SI prefixes differ but units are the same
  if (from == to)
    return 1;

  // if there's a direct conversion, return multiplier
  if (conv[from] && conv[from][to]) {
    logger.verbose('found direct conversion!');
    return conv[from][to];
  } else if (conv[to] && conv[to][from]) {
    logger.verbose('found opposite conversion, doing 1/x!');
    return 1.0 / conv[to][from];
  }

  var refUnit = referenceUnits[category];
  if (!refUnit) {
    throw new ConvertError('multi-step conversions for '+category+' unavailable - no reference unit!');
  }

  logger.verbose('trying to convert via '+ refUnit);

  var mul1 = unitConversions(category, from, refUnit);

  if (mul1) {
    logger.verbose('found conversion to '+ refUnit +' from ' + from + '!');
    var mul2 = unitConversions(category, refUnit, to);
    if (mul2) {
      logger.verbose('found conversion from '+ refUnit +' to ' + to + '!');
      return mul1 * mul2;
    }
  }

  throw new ConvertError('there is no direct conversion between these units!');
}

// Run the actual conversion from unit1 to unit2
function genericConvert(unit1, unit2, amount1) {
  var category = guessCategory(unit1);
  var cat2 = guessCategory(unit2);

  if (!category) {
    throw new ConvertError('the first unit does not exist! (try `convert.list`!)');
  } else if (!cat2) {
    throw new ConvertError('the second unit does not exist! (try `convert.list`!)');
  }

  if (cat2 !== category) {
    throw new ConvertError('the two units are not in the same category :(');
  }

  // handle SI units gracefully
  var mul1 = 1,
      mul2 = 1;

  unit1 = normalizeUnit(category, unit1);
  unit2 = normalizeUnit(category, unit2);

  if (unit1.indexOf('-') !== -1) {
    var tmp = unit1.split('-');
    mul1 = siPrefix(tmp[0]);
    unit1 = tmp[1];
  }

  if (unit2.indexOf('-') !== -1) {
    var tmp = unit2.split('-');
    mul2 = siPrefix(tmp[0]);
    unit2 = tmp[1];
  }

  var amount2 = unitConversions(category, unit1, unit2) * amount1 * mul1 / mul2;
  return amount2;
}



function ConvertError(message, value) {
  this.message = message;
  this.value = value;
}

nodeutil.inherits(ConvertError, Error);

var normalizations = {
  distance: {
    'ft': 'feet',
    'foot': 'feet',

    'm': 'meter',
    'metre': 'meter',
    'meters': 'meter',
    'metres': 'meter',
    'kilometer': 'kilometer',

    'km': 'kilo-meter',
    'cm': 'centi-meter',
    'dm': 'deci-meter',
    'mm': 'milli-meter',
    'nm': 'nano-meter',

    'fermi': 'femto-meter',
    'micron': 'micro-meter',
    'ångström': 'angstrom',

    'pc': 'parsec',
    'parsecs': 'parsec',

    'in': 'inch',
    'centimeter': 'centi-meter'
  },

  mass: {
    'g': 'gram',
    'mg': 'milli-gram',
    'kg': 'kilo-gram',
    'kilogram': 'kilo-gram',
    'tonne': 'mega-gram',
    'ton': 'mega-gram',
    'lb': 'pound',
    'ib': 'pound'
  }
};

var referenceUnits = {
  distance: 'meter',
  mass: 'gram',
  time: 'second'
};

var conversions = {
  // Category
  distance: {
    // From
    // { meter: To }
    // The converter also tries inversions
    // (eg 1/(meter->feet) for feet->meter)
    angstrom:     { meter: 1e-10  },
    feet:         { meter: 0.3048 },
    inch:         { meter: 0.0254 },
    fathom:       { meter: 1.8288 },
    furlong:      { meter: 0.3048 },
    lightyear:    { meter: 9.46091e+15 },
    micron:       { meter: 1e-6 },
    mil:          { meter: 2.54e-5 },
    mile:         { meter: 1609.344 },
    nautical_mile: { meter: 1852 },
    parsec:       { meter: 3.084e+16 },
    em:           { meter: 0.00035, },
    pt:           { meter: 0.0003 },
    yard:         { meter: 0.9144 },
    earth_radius:  { meter: 6371000 },
    au:           { meter: 149.59787e+9 },
    hubble_length: { meter: 13.8e+9 },
    planck_length: { meter: 1.61619926e-35 }
  },

  mass: {
    atomicmass:   { gram: 1.66e-24 },
    electronvolt: { gram: 1.783e-33 },
    planckmass:   { gram: 2.17651e-5 },
    slug:         { gram: 14600 },
    pound:        { gram: 453.59237 },
    solarmass:    { gram: 1.99e+33 },
    grain:        { gram: 0.064798 },
    drachm:       { gram: 1.771845 },
    ounce:        { gram: 28.34952 },
    stone:        { gram: 6350.29318 },
    quarter_mass:  { gram: 12700.6 },
    hundredweight: { gram: 50802.345 },
    imperial_ton:  { gram: 1016000.469 }
  },

  time: {
    minute: { second: 60 },
    hour:   { second: 3600 },
    day:    { second: 86400 },
    fortnight: { second: 86400 * 14 },
    week:   { second: 604800 },
    month:  { second: 30 * 86400 },
    year:   { second: 3.15576e7 },
    decade: { second: 3.15576e8 },
    century: { second: 3.15576e9 },
    millennium: { second: 3.15576e10 },
    plancktime: { second: 5.39e-44 },
    pjiffy:  { second: 3e-24 },
    svedberg: { second: 1e-13 },
    shake:  { second: 1e-8 },
    fourth: { second: 1/3600.0 },
    third:  { second: 1/60.0 },
    ejiffy: { second: 1/60.0 },
    moment: { second: 90 },
    ke:     { second: 14 * 60 + 24 },
    semester: { second: 10886400 }
  },



  SI: {
    yotta: 1e+24,  zetta: 1e+21,
    exa:   1e+18,  peta:  1e+15,
    tera:  1e+12,  giga:  1e+9,
    mega:  1e+6,   kilo:  1000,
    hecto: 100,    deca:  10,
    deci:  0.1,    centi: 0.01,
    milli: 0.001,  micro: 1e-6,
    nano:  1e-9,   pico:  1e-12,
    femto: 1e-15,  atto:  1e-18,
    zepto: 1e-21,  yocto: 1e-24
  }
};

String.prototype.startsWith = function(str) {
  return this.lastIndexOf(str, 0) === 0;
};

