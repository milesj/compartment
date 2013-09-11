/**
 * @copyright Copyright 2013, Miles Johnson - http://milesj.me
 * @license   http://opensource.org/licenses/mit-license.php
 * @link      http://milesj.me/code/nodejs/compartment
 */

(function() {
  'use strict';

var _ = require('lodash'),
    fs = require('fs'),
    util = require('util'),
    events = require('events');

function Compartment() {
  events.EventEmitter.call(this);
}

// Inherit emitter functionality
util.inherits(Compartment, events.EventEmitter);

/** Definite list of all components and dependencies */
Compartment.prototype.manifest = {};

/** Mapping of file types and source paths */
Compartment.prototype.types = {};

/** Generated component chain */
Compartment.prototype.chain = {};

/**
 * Load an external manifest file.
 *
 * @param {String} path
 * @returns {Compartment}
 */
Compartment.prototype.loadManifest = function(path) {
  if (!fs.existsSync(path)) {
    throw new Error('Manifest does not exist');
  }

  this.manifest = JSON.parse(fs.readFileSync(path, 'utf-8'));

  return this;
};

/**
 * Empty the manifest.
 *
 * @returns {Compartment}
 */
Compartment.prototype.clearManifest = function() {
  this.manifest = {};

  return this;
};

/**
 * Add a file type to include as a source lookup path.
 *
 * @param {String} type
 * @param {String} [path]
 * @returns {Compartment}
 */
Compartment.prototype.addType = function(type, path) {
  this.types[type] = path || '';

  return this;
};

/**
 * Add multiple file types.
 *
 * @param {Object} types
 * @returns {Compartment}
 */
Compartment.prototype.addTypes = function(types) {
  _.forEach(types, function eachTypes(value, key) {
    this.addType(key, value);
  }, this);

  return this;
};

/**
 * Add a component manually to the manifest.
 *
 * @param {String} key
 * @param {String} category
 * @param {Object} [source]
 * @param {Array} [require]
 * @param {Array} [provide]
 * @param {Number} [priority]
 * @returns {Compartment}
 */
Compartment.prototype.addComponent = function(key, category, source, require, provide, priority) {
  this.manifest[key] = {
    name: key,
    category: category,
    require: require || [],
    provide: provide || [],
    priority: priority || null,
    source: source || {}
  };

  return this;
};

/**
 * Add multiple components.
 *
 * @param {Object} components
 * @returns {Compartment}
 */
Compartment.prototype.addComponents = function(components) {
  _.forEach(components, function eachTypes(value, key) {
    this.manifest[key] = value;
  }, this);

  return this;
};

/**
 * Remove a component from the manifest.
 *
 * @param {String} key
 * @returns {Compartment}
 */
Compartment.prototype.removeComponent = function(key) {
  delete this.manifest[key];

  return this;
};

/**
 * Generate a component chain from a list of components.
 * If components is empty, use the entire manifest.
 * Can filter down items based on category.
 *
 * @param {String|Array} [components]
 * @param {String|Array} [category]
 * @returns {Compartment}
 */
Compartment.prototype.buildChain = function(components, category) {
  if (_.isEmpty(components)) {
    components = _.keys(this.manifest);

  } else if (!_.isArray(components)) {
    components = components.split(',');
  }

  this.chain = {};
  this.emit('preBuild', components);

  // Add dependencies from components list
  _.forEach(components, this.addDependency, this);

  // Filter out invalid category
  if (category) {
    _.forEach(this.chain, function filterCategory(value, key) {
      if (!value.category || !_.contains(category, value.category)) {
        delete this.chain[key];
      }
    }, this);
  }

  // Sort the chain priority
  var chain = this.sortChain(this.chain);

  this.emit('postBuild', chain);
  this.chain = chain;

  return this;
};

/**
 * Sort the hash of components using the priority property.
 * Will need to convert to an array to sort, then convert back to an object.
 *
 * @param {Object} chain
 * @returns {Object}
 */
Compartment.prototype.sortChain = function(chain) {
  var sorted = _.values(chain).sort(function(a, b) {
    var x = a.priority || 100, y = b.priority || 100;

    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  });

  var object = {};

  _.forEach(sorted, function afterSort(value) {
    object[value.name] = value;
  });

  return object;
};

/**
 * Resolve any dependencies between components and add them to the chain.
 *
 * @param {String} key
 * @returns {Compartment}
 */
Compartment.prototype.addDependency = function(key) {
  if (_.isUndefined(this.manifest[key])) {
    throw new Error('Invalid component ' + key);
  }

  var component = this.manifest[key];
      component.name = key;

  if (component.require) {
    _.forEach(component.require, this.addDependency, this);
  }

  this.chain[key] = component;

  if (component.provide) {
    _.forEach(component.provide, this.addDependency, this);
  }

  return this;
};

/**
 * Return a list of paths that are the sum of all the components in the chain.
 * Will append the type root path to each item in the list.
 *
 * @param {String} type
 * @param {Object} [chain]
 * @returns {Array}
 */
Compartment.prototype.getPaths = function(type, chain) {
  chain = chain || this.chain;

  if (_.isEmpty(chain)) {
    throw new Error('Chain must be generated using buildChain()');

  } else if (_.isUndefined(this.types[type])) {
    throw new Error('Invalid type ' + type);
  }

  var paths = [],
      root = this.types[type];

  _.forEach(chain, function eachPaths(value, key) {
    if (value.source && value.source[type]) {
      paths = _.union(paths, value.source[type]);
    }
  });

  paths = _.map(paths, function mapPaths(value) {
    return root + value;
  });

  this.emit('paths', paths);

  return paths;
};

/**
 * Return information about what a component provides.
 *
 * @param {String} key
 * @returns {Object}
 */
Compartment.prototype.getProvides = function(key) {
  if (_.isUndefined(this.manifest[key])) {
    throw new Error('Invalid component ' + key);
  }

  var component = this.manifest[key],
      provides = {};

  if (component.provide) {
    _.forEach(component.provide, function(value) {
      provides[value] = this.manifest[value];
    }, this);
  }

  return provides;
};

/**
 * Return information about a components requirements.
 *
 * @param {String} key
 * @returns {Object}
 */
Compartment.prototype.getRequires = function(key) {
  if (_.isUndefined(this.manifest[key])) {
    throw new Error('Invalid component ' + key);
  }

  var component = this.manifest[key],
      reqs = {};

  if (component.require) {
    _.forEach(component.require, function(value) {
      reqs[value] = this.manifest[value];
    }, this);
  }

  return reqs;
};

// Pass to node
module.exports = Compartment;

}).call(this);