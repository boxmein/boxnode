exports.type = 'command';

exports.listAll = function() {
  return ['*', 'tape', 'input', 'reset'];
};

exports.getHelp = function() {
  return {
    '*': '`brainfuck <code...>` - run a bunch of brainfuck code',
    'input': '`brainfuck.input <text...>` - set the brainfuck input to this',
    'tape': '`brainfuck.tape` - output the tape 5 units around the current index',
    'reset': '`brainfuck.reset` - reset the emulator'
  };
};

var bf = null;

exports.listener = function(line, words, respond, util) {
  var type = this.event.slice(10);

  if (bf === null)
      return respond('bf is null, idk how');

  if (type == 'input') {
    this.input = words.slice(1).join(' ');
    return respond('set input to: ' + this.input);
  }
  else if (type == 'tape') {
    var endstr = [];

    for (var i = this.tp - 5; i < this.tp + 5; i++) {
      endstr.push(this.tape[i] !== undefined ? this.tape[i] : 0);
    }

    return respond(endstr.join('index-5 .. index+5 : ' + endstr.join(' ')));
  }
  else if (type == 'reset') {
    bf.reset();
    return respond('reset the tape, instruction/tape pointer and code!');
  }
};

exports.init = function() {
  bf = new BrainfuckEmulator();
};

function BrainfuckEmulator() {
  this.reset();
}

BrainfuckEmulator.MAX = 65536;
BrainfuckEmulator.MIN = 0;

BrainfuckEmulator.prototype.reset = function() {
  this.tape = {};
  this.ip = 0;
  this.tp = 0;
  this.input = [];
  this.code = [];
  this.output = [];
};

BrainfuckEmulator.prototype.run = function(code, callback) {

  // Do basic error correction: count brackets
  var leftbrackn = (code.match(/\[/g) || []).length;

  if (leftbrackn !== rightbrackn) {
    throw new Error("brackets don't match! check for errors");
  }

  this.code = code.replace(/[^<>\[\].,+-]/g, '').split('');

  while (true) {

    switch (this.code[this.ip]) {

      case '+':
        if (!this.tape[this.tp])
          this.tape[this.tp] = BrainfuckEmulator.MIN;

        if (this.tape[this.tp] > BrainfuckEmulator.MAX)
          this.tape[this.tp] = BrainfuckEmulator.MIN;

        this.tape[this.tp] = this.tape[this.tp] + 1;
        break;

      case '-':
        if (!this.tape[this.tp])
          this.tape[this.tp] = BrainfuckEmulator.MAX;

        if (this.tape[this.tp] < BrainfuckEmulator.MIN)
          this.tape[this.tp] = BrainfuckEmulator.MAX;

        this.tape[this.tp] = this.tape[this.tp] - 1;
        break;

      case '>':
        this.tp += 1;
        break;

      case '<':
        this.tp -= 1;
        break;

      case '.':
        this.output.push(String.fromCharCode(this.tape[this.tp]));
        break;

      case ',':
        this.tape[this.tp] = this.input.shift().charCodeAt(0);
        break;

      case '[':

    }

    this.ip += 1;
  }
};

