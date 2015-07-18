function Chainer(arr) {
  var at = 0;
  var that = this;
  this.next = function next() {
    
    var args = Array.prototype.slice.call(arguments, 0);
    args.push(next);

    at += 1;
    if (at < arr.length) {
      // console.log('calling the handler', at, 'with args', args);
      arr[at].apply(that, args);
    }
    else {
      // console.log('calling the end handler with args', args);
      that.end_handler.apply(that, args);
    }
  };
}

MiddleEmitter.prototype.end_handler = function() {
  console.log('chainer ended its chain', arguments);
};

function MiddleEmitter() {
  this.listeners = {};
};

MiddleEmitter.prototype.on = function(event, listener) {
  // console.log('adding new event listener to ' + event);

  this.listeners[event] = this.listeners[event] || [];
  
  if (typeof listener === 'function')
    this.listeners[event].push(listener);
  else
    throw new Error('2nd argument: listener function expected, got ' + typeof listener);

  // console.log('event listeners for ' + event + ':', this.listeners[event]);
};

MiddleEmitter.prototype.emit = function(event) {
  // console.log('emitting an event', event);

  var evtchain = this.listeners[event];
  
  var args = Array.prototype.slice.call(arguments, 1);
  
  if (evtchain &&
      evtchain.length > 0) {
    // console.log('found a handler chain for this event', evtchain);
    var ch = new Chainer(evtchain);
    ch.end_handler = this.end_handler;
    args.push(ch.next);

    // console.log('calling evtchain[0] with args', args);
    evtchain[0].apply(null, args);
  }
};

module.exports.MiddleEmitter = MiddleEmitter;
