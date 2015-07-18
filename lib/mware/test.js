var sinon = require('sinon');
var should = require('should');
require('should-sinon');

var mware = require('./index');

var MiddleEmitter = mware.MiddleEmitter;

describe('MiddleEmitter', function() {
  describe('event emitter', function() {

    it('keeps track of event listeners', function() {
      var em = new MiddleEmitter();
      var asdf = function(asdf) {};
      em.on('asdf', asdf);
      em.listeners.asdf.should.exist;
      em.listeners.asdf.should.containEql(asdf);
    });

    it('propagates events to the first event listener', function() {
      var em = new MiddleEmitter();
      var asdf = sinon.spy();
      em.on('asdf', asdf);
      em.emit('asdf');
      asdf.should.be.called;
    });

    it('keeps event handlers separated by the event they\'re listening for', function() {
      var em = new MiddleEmitter();
      var asdf = sinon.spy(); 
      var ghjk = sinon.spy();

      em.on('asdf', asdf);
      em.emit('asdf');

      asdf.should.be.called;
      ghjk.should.not.be.called;

      em.on('ghjk', ghjk);
      em.emit('ghjk');

      ghjk.should.be.called;
    });

    it('passes arguments to event listeners', function() {
      var em = new MiddleEmitter();
      var asdf = sinon.spy();

      em.on('asdf', asdf);
      em.emit('asdf', 'hello');
      asdf.should.be.calledWith('hello');

      em.emit('asdf', 1, 2, 3, 4, 5, 6, 7);
      asdf.should.be.calledWith(1,2,3,4,5,6,7);
    });
  });

  describe('next', function(done) {
    it('passes a `next` callback to the event listener', function() {
      var em = new MiddleEmitter();
      var asdf = function(next) {
        next.should.exist;
        next.should.be.a.Function;
      };

      em.on('asdf', asdf);
      em.emit('asdf');
    });

    it('calls the next event handler iff next() is invoked', function() {
      var em = new MiddleEmitter();
      var asdf = function(next) {
        next();
      };
      var ghjk = sinon.spy();

      em.on('asdf', asdf);
      em.on('asdf', ghjk);

      em.emit('asdf');

      ghjk.should.be.called;

      var qwer = sinon.spy();
      var tyui = sinon.spy();

      em.on('ghjk', qwer);
      em.on('ghjk', tyui);

      em.emit('ghjk');

      qwer.should.be.called;
      tyui.should.not.be.called;
    });

    it('passes the next event handler the right arguments along with next()', function() {

      var em = new MiddleEmitter();

      var asdf = function(next) {
        next(1, 2, 3);
      };

      var ghjk = sinon.spy(function(a, b, c, next) {
        a.should.equal(1);
        b.should.equal(2);
        c.should.equal(3);
        should(next).exist;
        should(next).not.be.undefined;
        next.should.be.a.Function;
      });

      em.on('asdf', asdf);
      em.on('asdf', ghjk);

      em.emit('asdf');

    });

    it('runs the default ending function when nothing terminates the next()', function() {
      var em = new MiddleEmitter();
      var end_handler = sinon.spy();
      em.end_handler = end_handler;

      var asdf = function(next) {
        next();
      };

      em.on('asdf', asdf);
      em.emit('asdf');
      end_handler.should.be.called;
    });
  });

  describe('wildcards', function() {
    it('lets the user define sub-events separated by a dot');
    it('creates a tree of event handlers')
    it('sends wildcard event handlers any events from the superset');
  });
});