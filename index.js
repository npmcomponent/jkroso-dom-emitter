
var event = require('event')
  , match = require('delegate').match
  , unique = require('unique-selector')
  , domEvent = require('dom-event')

module.exports = DomEmitter

/**
 * Initialize a `DomEmitter`. If you provide a `context`
 * then that will be used to find methods. It will also
 * be `this` inside any handlers. `context` defaults to
 * `view`
 *
 *   new DomEmitter(document.body, {
 *     onClick: console.log  
 *   })
 *   
 * @param {DomElement} view
 * @param {Object} [context]
 */

function DomEmitter(view, context) {
	this.view = view
	this.context = context || view
	this.domBindings = {}
	this.behaviours = {}
}

/**
 * Bind to `type` with optional `method`. When `method` is 
 * undefined it inferred from `type`. Delegation is can be
 * specified in `type`
 *
 *    events.on('click', 'onClick')
 *    events.on('click') // implies "onClick"
 *    events.on('click', function (e) {})
 *    events.on('click .ok') // will only trigger if the click happened within a child with .ok class
 *
 * @param {String} type
 * @param {String} [method]
 * @return {Function} acts as a key to remove the behaviour
 */

DomEmitter.prototype.on = function(type, method){
	var parsed = parse(type)
	  , name = parsed.name
	  , binding = this.domBindings[name]

	if (typeof method !== 'function') {
		method = getMethod(method, name, this.context)
	}

	// bind to the dom
	if (!binding) {
		var path = unique(this.view) + ' '
		var context = this.context
		var behaviours = this.behaviours

		binding = this.domBindings[name] = function dispatcher(e){
			// main
			emit(context, behaviours[name], e)
			
			// delegated
			var selectors = dispatcher.selectors
			var len = selectors.length
			if (!len) return
			if (document.querySelector(path) !== this) {
				path = unique(this) + ' '
			}
			for (var i = 0; i < len; i++) {
				var targ = match(e.target, this, path + selectors[i])
				if (targ) {
					e.delegate = targ
					emit(context, behaviours[name+' '+selectors[i]], e)
				}
			}
		}

		binding.deps = 0
		binding.selectors = []
		event.bind(this.view, name, binding)
	}

	// count
	binding.deps++
	
	if (parsed.selector) {
		binding.selectors = binding.selectors.concat(parsed.selector)
	}

	addBehavior(this.behaviours, type, method)

	return method
}

function getMethod (name, type, context) {
	name = typeof name === 'string'
		? context[name]
		: context['on' + type[0].toUpperCase() + type.slice(1)]
	if (!name) throw new Error('Can\'t find a method for '+type)
	return name
}

function emit (context, handlers, data) {
	if (!handlers) return 
	for (var i = 0, len = handlers.length; i < len; i++) {
		handlers[i].call(context, data)
	}
}

function addBehavior (hash, name, fn) {
	if (hash[name]) hash[name] = hash[name].concat(fn)
	else hash[name] = [fn]
}

function removeBehaviour (hash, name, fn) {
	if (hash[name]) hash[name] = hash[name].filter(function (a) {
		return a !== fn
	})
	else delete hash[name]
}

/**
 * Remove a single behaviour
 * 
 * All the following are equivilent:
 *
 *   events.off('click', 'onClick')
 *   events.off('click') // implies 'onClick'
 *   events.off('click', events.onClick)
 *
 * @param {String} type
 * @param {String} [method]
 */

DomEmitter.prototype.off = function(type, method){
	var parsed = parse(type)
	  , name = parsed.name
	  , binding = this.domBindings[name]

	if (typeof method !== 'function') {
		method = getMethod(method, name, this.context)
	}

	if (--binding.deps <= 0) {
		delete this.domBindings[name]
		event.unbind(this.view, name, binding)
	} 
	else if (parsed.selector) {
		binding.selectors = binding.selectors.filter(function (s) {
			return s !== parsed.selector
		})
	}

	removeBehaviour(this.behaviours, type, method)
}

/**
 * Add listener but remove it as soon as its called once
 * @see DomEmitter#on
 */

DomEmitter.prototype.once = function (topic, method) {
	var self = this
	this.on(topic, once)
	if (typeof method !== 'function') {
		method = getMethod(method, parse(topic).name, this.context)
	}
	function once (e) {
		method.call(this, e)
		self.off(topic, once)
	}
	return once
}

// Native events tests
var isKey = /^(key(?:up|down|press))(?: +([\w\/]+(?: \w+))?)$/

/**
 * Create a DOM event and send it down to the DomEmitter's 
 * target. Any data you pass will be merged with the event 
 * object
 *
 *   manager.emit('mousedown', {clientX:50, clientY:50})
 *   manager.emit('login', {user: user})
 *   manager.emit('keydown a')
 * 
 * @param {String} topic
 * @param {Any} [data]
 */

DomEmitter.prototype.emit = function (topic, data) {
	var key = isKey.exec(topic)
	if (key) {
		topic = key[1]
		data.key = key[2]
	}

	var event = domEvent(topic, data)

	// merge 
	if (data) {
		var keys = Object.keys(data)
		var i = keys.length
		while (i--) {
			key = keys[i]
			event[key] = data[key]
		}
	}

	this.view.dispatchEvent(event)
}

/**
 * Remove all bound functions.
 * Optionally limited to a certain topic
 *
 *   this.clear() // all
 *   this.clear('click') // just click handlers
 *
 * @param {String} [topic]
 */

DomEmitter.prototype.clear = function (topic) {
	if (topic != null) return clearTopic(this, topic)
	for (topic in this.behaviours) {
		clearTopic(this, topic)
	}
}

function clearTopic (self, topic) {
	var name = parse(topic).name
	var binding = self.domBindings[name]

	binding && event.unbind(self.view, binding);

	delete self.domBindings[name];
	delete self.behaviours[topic];
}

/**
 * Parse event / selector string.
 *
 * @param {String} string
 * @return {Object}
 * @api private
 */

function parse(str) {
	str = str.split(' ')
	var event = str.shift()
	return { name: event, selector: str.join(' ') }
}
