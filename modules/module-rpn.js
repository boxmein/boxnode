exports.type = 'command';
var _ = require('underscore');

var stack = [];
var stack_max = 100;

var owner, myconfig;

exports.listAll = function() {
  return Object.keys(exports.getHelp());
};

exports.getHelp = function() {
  return {
    '*': '`rpn <calc...>` - reverse-polish notation calculator. all symbols in `rpn.help`.',
    'help': '`rpn.help <symbol>` - what does a specific symbol do?',
    'list': '`rpn.list` - list all rpn symbols available',
    'add': '`rpn.add <symbol> <definition...>` - add new symbol'
  };
};

exports.listener = function(line, words, respond, util) {
  var sub = this.event.slice(4);

  if (sub == 'help') {
    if (rpn.hasOwnProperty(words[1])) {
      respond(words[1] + ' - ' + rpn[words[1]].help);
    } else {
      respond('missing the symbol - see `help rpn.list`');
    }
    return;
  }
  else if (sub == 'list') {
    return respond('available symbols: ' +
        Object.keys(rpn).join(', ').slice(0, 200));
  }
  else if (sub == 'lex' && util.matchesHostname(owner, line.hostmask)) {
    respond(lexRPN(words.slice(1).join(' ')));
  }

  else if (sub == 'add') {
    var authed = false;
    for (var i = 0; i < myconfig.authorized.length; i++) {
      if (util.matchesHostname(myconfig.authorized[i], line.hostmask)) {
        authed = true;
        break;
      }
    }
    if (!authed)
      return respond('You can\'t do this!');
    var newsym = words[1];
    var def = words.slice(2).join(' ');
    rpn[newsym] = {
      help: 'the same as ' + def,
      code: def
    };
    respond('added new symbol: ' + newsym + ' => ' + def.slice(0, 80));
    return;
  }

  // should eval it probably

  var ws = words.slice(1).join(' ');
  var toks = lexRPN(ws);

  // respond ('instructions: ' + toks);
  // evaluate

  for (var i=0;i<toks.length;i++) {
    // console.log('evaluating token', toks[i]);
    evaluate(toks[i]);
  }

  // end of evaluation:
  // console.log('evaluation ended, printing stack');
  respond('stack after eval: ' + stack.join(', '));

  stack = [];
};

exports.init = function(config, mc, alias) {
  myconfig = mc;
  owner = config.owner;

  try {

    // count takes-gives stuff
    for (var k in rpn) {
      var ea = rpn[k];
      if (!ea.takes || !ea.gives) {
        try {
          var tg = calculateTakesGives(ea);
          console.log('calculated takes/gives: ', tg);
          rpn[k].takes += tg.takes;
          rpn[k].gives += tg.gives;
        } catch (err) {
          console.error('\x1b[31;1mtakes/gives calculation failed: ' + err.message + '\x1b[0m');
          // delete rpn[k];
        }
      }
    }

    console.log('module rpn initialized. max stack: ', stack_max);
    console.log('owner: ' + owner);
  }
  catch (err) {
    console.error('error initializing rpn: ', err);
    throw err;
  }

};


function lexRPN(words) {
  var i = 0;
  var lexed = [];
  var knownTokens = Object.keys(rpn);
  var valstr, maxlength;

  // console.log('known tokens: ', knownTokens);

  while (i < words.length) {
    // console.log('lexing new character:', words[i]);

    // Simple number parsing
    if (/[0-9.]/.test(words[i])) {
      // console.log('int found, seeing if there are more');
      valstr = '';
      maxlength = 20;
      valstr += words[i];

      while (maxlength --> 0 && /[0-9.]/.test(words[i+1])) {
        i += 1;
        // console.log('there were more, adding to end string:', words[i]);
        valstr += words[i];
      }

      // console.log('lexed an int, pushing to token list...');
      lexed.push(parseFloat(valstr, 10));

    }

    // found a quote mark, begin string
    else if (words[i] == '"') {
      // asd"f asdf asdf aa"asdf
      valstr = '';
      maxlength = 50;

      while (maxlength --> 0 && i+1 < words.length &&
             words[i+1] !== '"') {
        i += 1;
        valstr += words[i];
      }

      console.log('found string:', valstr);

      lexed.push(valstr.toString());

      // ignore the last quote mark too
      i++;
    }

    // Try and find commands in here, otherwise treat as nothing
    else if (/[A-Za-z\-]/.test(words[i])) {
      // console.log('letter found, might be a word command');
      valstr = '';
      maxlength = 10;
      valstr += words[i];

      while (maxlength --> 0 && i+1 < words.length &&
             /[A-Za-z\-]/.test(words[i+1]) ) {
        i += 1;
        // console.log('more letters!', words[i]);
        valstr += words[i];
      }

      if (knownTokens.indexOf(valstr) !== -1 ) {
        // // console.log('we know this word! allow it');
        lexed.push(valstr.toString());
      } else {
        // // console.log(valstr + ' not in known tokens');
      }
    }

    else if (knownTokens.indexOf(words[i]) !== -1) {
      // // console.log('character found, it is a single-letter command');
      lexed.push(words[i]);
    }

    i++;
  }

  return lexed;
}

function calculateTakesGives(symbol) {
  if (!rpn.hasOwnProperty(symbol))
    throw new Error('no such symbol');

  if (typeof rpn[symbol] !== 'object')
    throw new Error('malformed symbol definition');

  if (!rpn[symbol].hasOwnProperty('code'))
    throw new Error('symbol does not have source code');

  if (typeof rpn[symbol].code !== 'string')
    throw new Error('symbol source code not a string');

  var src = rpn[symbol].code.split(' ');

  var vals = src.reduce(function(acc, ea) {

    if (!rpn.hasOwnProperty(ea))
      throw new Error('no such symbol: ' + ea);

    if (!ea.takes || !ea.gives) {
      var no = calculateTakesGives(ea);
        acc.takes += no.takes;
        acc.gives += no.gives;
    } else {
      acc.takes += rpn[ea].takes;
      acc.gives += rpn[ea].gives;
    }

    return acc;
  }, {takes: 0, gives: 0});

  return vals;
}

function evaluate(tok, recursionLevel) {
  // console.log('evaluating: ', tok);
  if (!recursionLevel) recursionLevel = 1;

  if (typeof tok == 'number') {
    if (stack.length + 1 < stack_max) {
      // console.log('pushing number onto stack', tok);
      stack.push(tok);
      return;
    }
  }

  else if (rpn.hasOwnProperty(tok)) {
    // console.log('found symbol, gonna evaluate', tok);

    if (rpn[tok].fn) {
      // console.log('primitive symbol, running fn', tok);
      rpn[tok].fn();
    }

    else if (rpn[tok].code) {
      // console.log('nonprimitive, expanding');

      var toks = lexRPN(rpn[tok].code);
      if (recursionLevel < 7)
        toks.forEach(evaluate, recursionLevel + 1);
      else {
        console.log('Stack limit reached - stopping recursion');
        stack.push('StackOverflowError');
      }
    }
  }

  else {
    if (stack.length + 1 < stack_max)
      stack.push(tok);
  }
}

var rpn = {
  '+': {
    help: '(int a, int b -- a + b) adds a and b',
    fn: function() {
      if (stack.length < 2)
        return stack.push('UnderflowError');

      var a = parseInt(stack.pop(), 10);
      var b = parseInt(stack.pop(), 10);

      if (isNaN(a))
        return stack.push('isNaN(a)');

      if (isNaN(b))
        return stack.push('isNaN(b)');

      stack.push(a + b);
    },
    takes: 2,
    gives: 1
  },

  '-': {
    help: '(int a, int b -- a - b) subtracts b from a',
    fn: function() {
      if (stack.length < 2)
        return stack.push('UnderflowError');

      var b = parseInt(stack.pop(), 10);
      var a = parseInt(stack.pop(), 10);

      if (isNaN(a))
        return stack.push('isNaN(a)');

      if (isNaN(b))
        return stack.push('isNaN(b)');

      stack.push(a - b);
    },
    takes: 2,
    gives: 1
  },

  '>': {
    help: '(int a, int b -- a > b ? 1 : 0) returns 1 if a > b',
    fn: function() {
      if (stack.length < 2)
        return stack.push('UnderflowError');

      var a = parseInt(stack.pop(), 10);
      var b = parseInt(stack.pop(), 10);

      if (isNaN(a))
        return stack.push('isNaN(a)');

      if (isNaN(b))
        return stack.push('isNaN(b)');

      stack.push(a > b ? 1 : 0);
    },
    takes: 2,
    gives: 1
  },

  '*': {
    help: '(int a, int b -- a * b) returns a multiplied by b',
    fn: function() {
      if (stack.length < 2)
        return stack.push('UnderflowError');

      var a = parseInt(stack.pop(), 10);
      var b = parseInt(stack.pop(), 10);

      if (isNaN(a))
        return stack.push('isNaN(a)');

      if (isNaN(b))
        return stack.push('isNaN(b)');

      stack.push(a * b);
    },
    takes: 2,
    gives: 1
  },

  'not': {
    help: '(a -- a == 0 ? 1 : 0) returns 1 if a == 0',
    fn: function() {
      if (stack.length < 1)
        return stack.push('UnderflowError');

      var a = parseInt(stack.pop(), 10);

      if (isNaN(a))
        return stack.push('isNaN(a)');

      stack.push(a === 0 ? 1 : 0);
    },
    takes: 1,
    gives: 1
  },

  'dup': {
    help: '(a -- a a) duplicates the argument at the top of the stack',
    fn: function() {
      if (stack.length < 1)
        return stack.push('UnderflowError');

      var a = stack.pop();

      if (stack.length + 2 > stack_max)
        return stack.push('OverflowError');

      stack.push(a);
      stack.push(a);
    },
    takes: 1,
    gives: 2
  },

  'swap': {
    help: '(a b -- b a) swaps the two top elements',
    fn: function() {
      if (stack.length < 2)
        return stack.push('UnderflowError');

      var a = stack.pop();
      var b = stack.pop();

      stack.push(a);
      stack.push(b);
    },
    takes: 2,
    gives: 2
  },

  '<': {
    help: '(int a, int b -- a < b ? 1 : 0) returns 1 if a < b',
    code: 'swap >'
  },

  'or': {
    help: '(a b -- a || b) returns b if a otherwise a',
    fn: function() {
      if (stack.length < 2)
        return stack.push('UnderflowError');

      var a = stack.pop();
      var b = stack.pop();

      stack.push(a || b);
    },
    takes: 2,
    gives: 1
  },

  'and': {
    help: '(a b -- a && b) returns a if a otherwise b',
    fn: function() {
      if (stack.length < 2)
        return stack.push('UnderflowError');

      var a = stack.pop();
      var b = stack.pop();

      stack.push(a && b);
    },
    takes: 2,
    gives: 1
  },

  'bor': {
    help: '(a b -- a | b) returns their binary OR',
    fn: function() {
      if (stack.length < 2)
        return stack.push('UnderflowError');

      var a = stack.pop();
      var b = stack.pop();

      stack.push(a | b);
    }
  },

  'band': {
    help: '(int a, int b -- a & b) returns their binary AND',
    fn: function() {
      if (stack.length < 2)
        return stack.push('UnderflowError');

      var b = parseInt(stack.pop(), 10);
      var a = parseInt(stack.pop(), 10);

      if (isNaN(a))
        return stack.push('isNaN(a)');

      if (isNaN(b))
        return stack.push('isNaN(b)');

      stack.push(a & b);
    }
  },

  'bxor': {
    help: '(int a, int b -- a ^ b) returns their binary XOR',
    fn: function() {
      if (stack.length < 2)
        return stack.push('UnderflowError');

      var b = parseInt(stack.pop(), 10);
      var a = parseInt(stack.pop(), 10);

      if (isNaN(a))
        return stack.push('isNaN(a)');

      if (isNaN(b))
        return stack.push('isNaN(b)');

      stack.push(a ^ b);
    }
  },

  'shl': {
    help: '(int a, int b -- a << b) shift a left by b',
    fn: function() {
      if (stack.length < 2)
        return stack.push('UnderflowError');

      var b = parseInt(stack.pop(), 10);
      var a = parseInt(stack.pop(), 10);

      if (isNaN(a))
        return stack.push('isNaN(a)');

      if (isNaN(b))
        return stack.push('isNaN(b)');

      stack.push(a << b);
    }
  },

  'shr': {
    help: '(int a, int b -- a >> b) shift a right by b',
    fn: function() {
      if (stack.length < 2)
        return stack.push('UnderflowError');

      var b = parseInt(stack.pop(), 10);
      var a = parseInt(stack.pop(), 10);

      if (isNaN(a))
        return stack.push('isNaN(a)');

      if (isNaN(b))
        return stack.push('isNaN(b)');

      stack.push(a >> b);
    }
  },

  'eq': {
    help: '(a, b -- a == b ? 1 : 0) returns 1 if the elements are equal',
    fn: function() {
      if (stack.length < 2)
        return stack.push('UnderflowError');

      var a = stack.pop();
      var b = stack.pop();

      stack.push(a == b ? 1 : 0);
    }
  },

  'neq': {
    help: '(int a, int b -- a != b ? 1 : 0) returns 1 if the elements are inequal',
    code: 'eq not'
  },

  'pow': {
    help: '(int a, int b -- a ** b) returns a to the power of b',
    fn: function() {
      if (stack.length < 2)
        return stack.push('UnderflowError');

      var b = parseInt(stack.pop(), 10);
      var a = parseInt(stack.pop(), 10);

      if (isNaN(a))
        return stack.push('isNaN(a)');

      if (isNaN(b))
        return stack.push('isNaN(b)');

      stack.push(Math.pow(a, b));
    }
  },
      var b = stack.pop();
      var a = stack.pop();

    }
  }
};
