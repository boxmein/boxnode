/*
  [22:23.01] <CeeJayBee> boxmein, are you a cumberbitch
  ~boxmein
*/
var _ = require('underscore');

exports.type = 'command';

exports.listAll = function() {
  return ['*'];
};

exports.getHelp = function() {
  return {'*': '`amiacumberbitch` - AM I?' };
};

var list = [
  'nah',
  'nope',
  'not really...',
  'sometimes',
  'only on the weekends',
  'only when drunk',
  'rather not',
  'I wouldn\'t say so',
  'what makes you say that?',
  'what makes you think that?',
  'how \x1dDARE\x1d you',
  'why would I be?',
  '' +Math.random(),
  'DOES NOT COMPUTE'];

exports.listener = function(a,b,r) {
  r(_.sample(list));
};
