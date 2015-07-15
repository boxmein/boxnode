var logger = new require('toplog')({concern: 'cron', loglevel: 'VERBOSE'});
exports.type = 'command';

var nodeutil = require('util');
var util = null;
var commands = {};
var cronstate = {};
cronstate.tasks = {};

var scheduler = {};
scheduler._started = false;
scheduler._lastTick = 0;

exports.listAll = function() {
  return Object.keys(exports.getHelp());
};

exports.getHelp = function() {
  return {
    '*': '`cron` - a module that lets you schedule commands. check out `list cron`!',
    'at': '`cron.at <time> <thing...>` - do a thing at a given time. give the time as unix time :P',
    'in': '`cron.in <time> <thing...>` - do a thing in <time> seconds. a thing can be any command',
    'list': '`cron.list` - list all your cron tasks',
    'delete': '`cron.delete <tid>` - delete your task with ID <tid>',
    'date': '`cron.date <datestring...>` - convert some kind of date into an unix time (any Javascript-parseable dates are OK)',
    'start_scheduler': '`cron.start_scheduler` - wake up the cron scheduler',
    'stop_scheduler': '`cron.stop_scheduler` - stop the cron scheduler',
    'info': '`cron.info <task>` - detailed information on a task with this ID'
  };
};


exports.listener = function(line, words, respond, util) {
  logger.verbose('cron command running, seeing what we should do');
  var evt = this.event.slice(5);
  if (commands.hasOwnProperty(evt)) {
    commands[evt].call(this, line, words, respond, util);
  } else {
    respond('no such command! try `list cron`!');
  }
};

function CronTask(time, command, line, words, respond) {
  logger.verbose('creating new cron task for ' + line.nick);
  this.time = time;
  this.command = command;
  this.line = line;
  this.words = words;
  this.respond = respond;
  this.runs = 0;
}

CronTask.prototype.run = function() {
  logger.verbose('running the cron task for ' + this.line.nick);
  this.runs += 1;
  util.fakeEmit(this.command, this.line, this.words, this.respond);
};

CronTask.prototype.runOnce = function() {
  logger.verbose('running the cron task only once...');
  if (this.runs == 0) this.run();
};

function pushTask(hostname, time, command, line, words, respond) {
  if (!cronstate.tasks[hostname]) cronstate.tasks[hostname] = [];
  cronstate.tasks[hostname].push(new CronTask(time, command, line, words, respond));
}

commands.at = function(line, words, respond, util) {
  logger.verbose('cron.at called, gonna try and add the task');
  
  if (!words[1] || isNaN(parseInt(words[1], 10))) {
    logger.debug('failed to add the task, words[1] was inexistent/NaN');
    return respond('the first parameter was not right! try `help cron.at`!');
  }
  
  var time = parseInt(words[1], 10);

  if (!words[2]) {
    logger.verbose('no words[2], assuming there is no command');
    return respond('specify a command already!');
  }

  logger.verbose('constructing fake words[] for fakeEmit');
  var newwords = words.slice(2);
  newwords[0] = '\\' + newwords[0];

  logger.verbose(newwords);

  pushTask(line.hostname, time, words[2], line, newwords, respond);
};

commands.in = function(line, words, respond, util) {
  logger.verbose('cron.in called, gonna try and add the task');
  
  if (!words[1] || isNaN(parseInt(words[1], 10))) {
    logger.debug('failed to add the task, words[1] was inexistent/NaN');
    return respond('the first parameter was not right! try `help cron.at`!');
  }
  
  var time = parseInt(words[1], 10);
  time *= 1000;
  time += Date.now();

  if (!words[2]) {
    logger.verbose('no words[2], assuming there is no command');
    return respond('specify a command already!');
  }

  logger.verbose('constructing fake words[] for fakeEmit');
  var newwords = words.slice(2);
  newwords[0] = '\\' + newwords[0];

  logger.verbose(newwords);

  pushTask(line.hostname, time, words[2], line, newwords, respond);
};

commands.list = function(line, words, respond, util) {
  var my_tasks = cronstate.tasks[line.hostname];

  if (!my_tasks || my_tasks.length == 0) {
    respond('you have no pending tasks!');
  } else {
    respond('(use `cron.info <id>` for info): ' +
      my_tasks.map(function(each, i) { 
        return '(' + i + ': at '  + each.time + ')'
      }).join(', '));
  }
};

commands.info = function(line, words, respond, util) {
  if (!words[1]) {
    return respond('no id specified! try `help cron.info`!');
  }
  var id = parseInt(words[1], 10);

  if (isNaN(id)) {
    return respond('id was not a number! try `help cron.info`!');
  }

  if (cronstate.tasks[line.hostname] && cronstate.tasks.length > 0) {
    var t = cronstate.tasks[line.hostname][id];

    if (!t) {
      return respond('there is no such task!');
    }

    respond(nodeutil.format('id: %d, at: %d, command: `%s`', id, t.time, t.words.join(' ')));
  }
};

commands.date = function(line, words, respond, util) {
  if (words.length > 1) {
    try {
      respond(new Date(words.slice(1).join(' ')).getTime()); 
    } catch (err) {
      logger.error(err.stack);
      respond('error parsing the time!');
    }
  } else { 
    respond('not enough words, need more than 1!');
  }
};

commands.start_scheduler = function(line, words, respond, util) {
  if (util.matchesHostname(util.config.get('owner'), line.hostmask)) {
    scheduler.start();
    respond('started the cron scheduler');
  } else {
    logger.verbose(line.hostmask, 'tried to start cron scheduler');
    respond('you aren\'t allowed to do this!');
  }
};

commands.stop_scheduler = function(line, words, respond, util) {
  if (util.matchesHostname(util.config.get('owner'), line.hostmask)) {
    scheduler.stop();
    respond('the scheduler was just stopped!');
  } else {
    logger.verbose(line.hostmask, 'tried to stop the cron scheduler');
    respond('you aren\'t allowed to do this!');
  }
};

scheduler.start = function() {
  if (!scheduler._started) {
    logger.info('starting cron scheduler');
    scheduler._timeout = setTimeout(scheduler.tick, util.config.get('modules.cron.scheduler_delay', 60000));  
    scheduler._started = true;
  }
};

scheduler.stop = function() {
  logger.info('stopping cron scheduler');
  scheduler._started = false;
  clearTimeout(scheduler._timeout);
};

scheduler.tick = function() {
  logger.verbose('cron scheduler tick');
  var now_time = Date.now();
  
  for (var k in cronstate.tasks) {

    // run every task eligible
    cronstate.tasks[k].forEach(function(ea) {
      if (ea.time >= scheduler._lastTick && ea.time < now_time && ea.runs == 0) {
        logger.verbose('running', ea.words, 'in channel? ' + ea.line.channel);
        ea.runOnce();
      }
    });

    // delete all tasks with > 0 runs
    cronstate.tasks[k] = cronstate.tasks[k].filter(function(ea) { return ea.runs == 0; });
  }

  if (scheduler._started) {
    scheduler._timeout = setTimeout(scheduler.tick, util.config.get('modules.cron.scheduler_delay', 60000));
  }
  scheduler._lastTick = now_time;
};

exports.init = function(u, addAlias) {
  logger.verbose('storing util for later');
  util = u;
};
