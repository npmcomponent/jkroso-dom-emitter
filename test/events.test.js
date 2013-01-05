
var DomEmitter = require('dom-emitter');
var assert = require('component-assert');

describe('DomEmitter', function (test, node) {
	test = document.getElementById('test')
	beforeEach(function () {
		test.innerHTML = '<div id="target"></div>'
		node = test.firstChild
	})

	it('can be inherited by a view', function (done) {
		function View (node) {
			this.view = node
			DomEmitter.call(this)
			this.on('click')
		}
		View.prototype.__proto__ = DomEmitter.prototype
		View.prototype.onClick = function (e) {
			done()
		}
		var view = new View(node)
		view.emit('click')
	})
	
	describe('.on(event)', function(){
		it('should default to invoking "on<Event>"', function(done){
			new DomEmitter(node, { onClick: function(){done()} }).on('click')
			happen.click(node)
		})
		it('should event object', function(done){
			new DomEmitter(node, {
				onClick: function(e){
					assert(e)
					done()
				}
			}).on('click')
			happen.click(node)
		})
		it('should error if no valid method is present', function(done){
			try { new DomEmitter(node).on('click') } 
			catch (e) { done() }
		})
	})

	describe('.on(event, method:string)', function(){
		it('should invoke the given method', function(done){
			new DomEmitter(node, { click: function () {done()} }).on('click', 'click')
			happen.click(node)
		})
		it('should bind to dom events', function (done) {
			new DomEmitter(node).on('click', function () {done()})
			happen.click(node)
		})
		it('should call in the context given', function (done) {
			var self = { 
				click: function () {
					assert(self === this)
					done()
				}
			}
			new DomEmitter(node, self).on('click', 'click')
			happen.click(node)
		})
	})

	describe('.on(event, method:function)', function () {
		it('should invoke the given function', function(done){
			new DomEmitter(node).on('click', function () {done()})
			happen.click(node)
		})
		it('should return the given function', function () {
			function fn() {}
			assert(new DomEmitter(node).on('click', fn) === fn)
		})
		it('should call in the context given', function (done) {
			var self = {}
			new DomEmitter(node, self).on('click', function () {
				assert(self === this)
				done()
			})
			happen.click(node)
		})
	})

	describe('.off(event)', function () {
		it('should imply the method name', function () {
			var methods = {
				onClick: function(e){
					assert(false, 'Should not be called')
				}
			}
			var m = new DomEmitter(node, methods)
			m.on('click')
			m.off('click')
			happen.click(node)
		})
		it('should error if it can\'t find a method', function (done) {
			try { new DomEmitter(node).off('click') } 
			catch (e) { done() }
		})
	})

	describe('.off(event, method:string)', function(){
		it('should unbind a single binding', function(){
			var e = new DomEmitter(node, {
				login: function(){
					assert(0, 'should not invoke .login()');
				}
			})

			e.on('click', 'login');
			e.off('click', 'login');
			happen.click(node)
		})
	})
	describe('.off(event, method:function)', function () {4
		it('should remove the given function', function () {
			var e = new DomEmitter(node)
			var fn = e.on('click', function () {assert(false, '.onclick() should not have been called')})
			e.off('click', fn)
			happen.click(node)
		})
	})
	describe('.clear()', function () {
		it('should remove all event types', function () {
			var e = new DomEmitter(node, {
				onClick: function(){
					assert(0, 'should not invoke .click()')
				},
				onMouseup: function(){
					assert(0, 'should not invoke .mouseup()')
				}
			})
			e.on('click')
			e.on('mouseup')
			e.clear()
			happen.click(node)
			happen.mouseup(node)
		})
	})
	describe('.clear(event)', function(){
		it('should unbind all bindings for the given event', function(){
			var e = new DomEmitter(node, {
				onClick: function(){
					assert(0, 'should not invoke .click()');
				}
			})
			e.on('click')
			e.on('click', function () {
				assert(false, 'Should not be called')
			})
			e.clear('click')
			happen.click(node)
		})
	})

	describe('.emit(type, options)', function () {
		it('should trigger all matching handlers', function (done) {
			var e = new DomEmitter(node, {
				onSelect: function () {
					done()
				}
			})
			e.on('select')
			e.emit('select')
			e.clear()
		})
		it('should target the event DomEmitter\'s DOM node', function (done) {
			var e = new DomEmitter(node, {
				onSelect: function (e) {
					assert(node === e.target)
					done()
				}
			})
			e.on('select')
			e.emit('select')
			e.clear()
		})
		it('should simulate native mouse events', function (done) {
			var e = new DomEmitter(node, {
				onClick: function (e) {
					assert(e.clientX === 50)
					assert(e.clientY === 50)
					assert(e instanceof MouseEvent)
					done()
				}
			})
			e.on('click')
			e.emit('click', {clientX:50,clientY:50})
			e.clear()
		})
	})
})
