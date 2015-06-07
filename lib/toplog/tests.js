// Test toplog

var assert = require('assert');
var should = require('should');

var toplog = require('./toplog');

describe('toplog', function() {

  describe('Constructor', function() {
    it('has an empty constructor', function() {
      (function() { return new toplog(); }).should.not.throw();
    });

    it('creates a correct object with empty constructor', function() {
      var a = new toplog();
      a.properties.color.should.be.true;
    });

    it('accepts an object to set various properties', function() {

      (function() { return new toplog({}); }).should.not.throw();
      (function() { return new toplog({'color': false}); }).should.not.throw();

    });

    it('actually saves configured properties', function() {
      var a = new toplog({color: false});
      a.properties.color.should.be.false;

      var logLevels = ['VERBOSE', 'ERROR', 'FATAL'];

      var b = new toplog({
        loglevels: logLevels
      });

      b.properties.loglevels.should.be.instanceof(Array).and.eql(logLevels);
    });

    it('uses default values for properties that are not set', function() {
      var a = new toplog();
      a.properties.color.should.be.true;
    });
  });

  describe('Colors', function() {
    it('outputs colors only when the "color" property is true', function() {
      var a = new toplog({color: true, formatstring: ''});
      a.properties.color.should.be.true;

      var old_con_log = console.log;
      // color == true -> colors work
      var flag = false;
      console.log = function(a) {
        flag = a == '\x1b[37;0m\x1b[0m';
      };
      a.debug();

      console.log = old_con_log;

      flag.should.be.true;

      // color == false -> colors don't work
      a = new toplog({color: false, formatstring: ''});
      a.properties.color.should.be.false;

      flag = false;
      console.log = function(a) {
        flag = a == '';
      };
      a.debug();

      console.log = old_con_log;

      flag.should.be.true;
    });
    it('accepts log level colors', function() {
      var a = new toplog({
        color: true,
        formatstring: '',
        loglevels: ['DEBUG'],
        colors: {'DEBUG': '\x1b[31;1m'}
      });

      a.properties.colors.should.have.property('DEBUG');
      a.properties.colors.DEBUG.should.eql('\x1b[31;1m');
    });

    it('outputs the right colour', function() {
      var a = new toplog({
        color: true,
        formatstring: '',
        loglevels: ['DEBUG'],
        colors: {'DEBUG': '31;1'}
      });

      var old_con_log = console.log;

      var flag = false;
      console.log = function(a) {
        flag = a == '\x1b[31;1m\x1b[0m';
      };
      a.debug();

      console.log = old_con_log;

      flag.should.be.true;
    });

    it('outputs a color reset (ESC[0m)', function() {
      var a = new toplog({
        color: true,
        formatstring: ''
      });

      var old_con_log = console.log;
      // color == true -> colors work
      var flag = false;
      console.log = function(a) {
        a.should.endWith('\x1b[0m');
      };
      a.debug();

      console.log = old_con_log;
    });
    it('uses the respective colors for each log level', function() {
      var a = new toplog({
        color: true,
        formatstring: '',
        loglevels: ['DEBUG', 'FATAL'],
        colors: {'DEBUG': '31;1', 'FATAL': '32;1'}
      });

      var old_con_log = console.log;

      var flag1 = false, flag2 = false;
      console.log = function(a) {
        flag1 = a == '\x1b[31;1m\x1b[0m';
      };
      a.debug();

      console.log = function(a) {
        flag2 = a == '\x1b[32;1m\x1b[0m';
      };
      a.fatal();

      console.log = old_con_log;

      flag1.should.be.true;
      flag2.should.be.true;
    });
  });

  describe('Format string', function() {
    it('uses the format string property', function() {
      var a = new toplog({color: false, formatstring: 'hello'});

      var old_con_log = console.log;

      var text = null;
      console.log = function(a) {
        text = a;
      };
      a.debug();

      console.log = old_con_log;

      text.should.eql('hello');
    });
    it('replaces "%time" with a timestamp', function() {
      var a = new toplog({color: false, formatstring: '%time'});

      var old_con_log = console.log;

      var text = null;
      console.log = function(a) {
        text = a;
      };
      a.debug();

      console.log = old_con_log;

      text.should.not.eql('%time');
    });
    it('replaces "%concern" with the concern', function() {
      var a = new toplog({color: false, formatstring: '%concern'});

      var old_con_log = console.log;

      var text = null;
      console.log = function(a) {
        text = a;
      };
      a.debug();

      console.log = old_con_log;

      text.should.not.eql('%concern');
    });
    it('replaces "%loglevel" with the log level', function() {
      var a = new toplog({color: false, formatstring: '%loglevel'});

      var old_con_log = console.log;

      var text = null;
      console.log = function(a) {
        text = a;
      };
      a.debug();

      console.log = old_con_log;

      text.should.not.eql('%loglevel');
      text.should.eql('DEBUG');
    });
    it('replaces "%loglevel1" with the log level\'s first letter', function() {
      var a = new toplog({color: false, formatstring: '%loglevel1'});

      var old_con_log = console.log;

      var text = null;
      console.log = function(a) {
        text = a;
      };
      a.debug();

      console.log = old_con_log;

      text.should.not.eql('%loglevel1');
      text.should.eql('D');
    });
  });


  describe('Separation of concerns', function() {
    it('accepts a string as the first parameter', function() {

      (function() {
        return new toplog('asdf');
      }).should.be.ok.and.should.not.throw();

    });
    it('outputs a concern string for each instance of the a', function() {

      var a = new toplog({
        'formatstring': '%concern',
        'concern': 'TEST',
        'separation_of_concerns': true,
        'color': false,
        'loglevels': ['DEBUG']
      });

      var old_con_log = console.log;
      var flag = false;
      console.log = function(a) {
        flag = a == 'TEST';
      };
      a.debug();

      console.log = old_con_log;

      flag.should.be.true;

    });

    it('does not output a concern string if turned off', function() {
      var a = new toplog({
        'formatstring': '%concern',
        'concern': 'TEST',
        'separation_of_concerns': false,
        'color': false,
        'loglevels': ['DEBUG']
      });

      var old_con_log = console.log;
      var flag = false;
      console.log = function(a) {
        flag = a == '';
      };
      a.debug();

      console.log = old_con_log;

      flag.should.be.true;
    });
  });

  describe('Log levels', function() {
    it('outputs the right log level', function() {
      var a = new toplog({
        'formatstring': '%loglevel',
        'color': false,
      });

      var old_con_log = console.log;
      var flag1 = false, flag2 = false;
      console.log = function(a) {
        flag1 = a == 'DEBUG';
      };
      a.debug();

      console.log = function(a) {
        flag2 = a == 'FATAL';
      };
      a.fatal();

      console.log = old_con_log;

      flag1.should.be.true;
      flag2.should.be.true;
    });
    it('outputs the right log level initial', function() {
      var a = new toplog({
        'formatstring': '%loglevel1',
        'color': false,
      });

      var old_con_log = console.log;
      var flag1 = false, flag2 = false;
      console.log = function(a) {
        flag1 = a == 'D';
      };
      a.debug();

      console.log = function(a) {
        flag2 = a == 'F';
      };
      a.fatal();

      console.log = old_con_log;

      flag1.should.be.true;
      flag2.should.be.true;
    });
    it('filters output by log level', function() {
      var a = new toplog({
        formatstring: '%loglevel',
        color: false,
        loglevels: ['DEBUG', 'ERROR', 'FATAL'],
        loglevel: 'ERROR'
      });

      var output = [];
      var old_con_log = console.log;

      console.log = function(a) { output.push(a); };

      a.debug();
      a.error();
      a.fatal();

      console.log = old_con_log;

      output.should.eql(['ERROR', 'FATAL']);
    });
  });

  describe('Timestamps', function() {
    it('outputs a timestamp', function() {
      var a = new toplog({
        timestamp: true,
        color: false,
        formatstring: '%time'
      });

      var old_con_log = console.log;

      var text = null;
      console.log = function(a) {
        text = a;
      };

      a.debug();

      console.log = old_con_log;

      text.should.not.eql('%time');
    });

    it('outputs a timestamp with the format HH:MM:SS', function() {
      var a = new toplog({
        timestamp: true,
        color: false,
        formatstring: '%time'
      });

      var old_con_log = console.log;

      var text = null;
      console.log = function(a) {
        text = a;
      };

      a.debug();

      console.log = old_con_log;

      text.should.match(/^\d\d:\d\d:\d\d$/);
    });
    it('outputs a timestamp with the correct time', function() {
      var a = new toplog({
        timestamp: true,
        color: false,
        formatstring: '%time'
      });

      var old_con_log = console.log;

      var text = null;
      console.log = function(a) {
        text = a;
      };

      a.debug();

      console.log = old_con_log;

      var d = new Date();
      var time = text.split(":");

      Number(time[0]).should.be.ok.and.exactly(d.getHours());
      Number(time[1]).should.be.ok.and.approximately(d.getMinutes(), 1);
      Number(time[2]).should.be.ok.and.approximately(d.getSeconds(), 1);
    });
  });

});
