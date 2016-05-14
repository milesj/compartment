/**
 * @copyright Copyright 2013, Miles Johnson - http://milesj.me
 * @license   http://opensource.org/licenses/mit-license.php
 * @link      http://milesj.me/code/nodejs/compartment
 */

(function() {
  'use strict';

  var fs = require('fs'),
      util = require('util'),
      events = require('events');

  function Compartment() {
    /** Definite list of all components and dependencies */
    this.manifest = {};

    /** Mapping of file types and source paths */
    this.types = {};

    /** Generated component chain */
    this.chain = {};

    events.EventEmitter.call(this);
  }

  // Inherit emitter functionality
  util.inherits(Compartment, events.EventEmitter);

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
    Object.keys(types).forEach(function(key) {
      this.addType(key, types[key]);
    }.bind(this));

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
    Object.keys(components).forEach(function(key) {
      this.manifest[key] = components[key];
    }.bind(this));

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
   * Get a component from the manifest.
   *
   * @param {String} key
   * @returns {Object}
   */
  Compartment.prototype.getComponent = function(key) {
    if (typeof this.manifest[key] === 'undefined') {
      throw new Error('Invalid component ' + key);
    }

    var component = this.manifest[key];
        component.key = key;

    return component;
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
    if (!components) {
      components = Object.keys(this.manifest);

    } else if (!Array.isArray(components)) {
      components = components.split(',');
    }

    this.chain = {};
    this.emit('preBuild', components);

    // Sort component list
    var chain = this.sortChain(components);

    // Add dependencies from components list
    Object.keys(chain).forEach(function(key) {
      this.addDependency(chain[key]);
    }.bind(this));

    // Filter out invalid category
    if (category) {
      Object.keys(this.chain).forEach(function(key) {
        var value = this.chain[key];

        if (
            !value.category ||
            typeof category === 'string' && category !== value.category ||
            Array.isArray(category) && category.indexOf(value.category) < 0
        ) {
          delete this.chain[key];
        }
      }.bind(this));
    }

    this.emit('postBuild', this.chain);

    return this;
  };

  /**
   * Sort the list of components using the priority property and name/key property.
   *
   * @param {Array} components
   * @returns {Object}
   */
  Compartment.prototype.sortChain = function(components) {
    var list = [];

    components.forEach(function(key) {
      list.push(this.getComponent(key));
    }.bind(this));

    var sorted = list.sort(function(a, b) {
      var x = a.priority || 100,
        y = b.priority || 100,
        x2 = a.name || a.key,
        y2 = b.name || b.key;

      return ((x < y) ? -1 : ((x > y) ? 1 : x2.localeCompare(y2)));
    });

    var chain = {};

    sorted.forEach(function(value) {
      chain[value.key] = value;
    });

    return chain;
  };

  /**
   * Resolve any dependencies between components and add them to the chain.
   *
   * @param {Object} component
   * @returns {Compartment}
   */
  Compartment.prototype.addDependency = function(component) {
    var key = component.key;

    if (this.chain[key]) {
      return this;
    }

    var addDependency = function(key) {
      this.addDependency(this.getComponent(key));
    }.bind(this);

    if (component.require) {
      component.require.forEach(addDependency);
    }

    this.chain[key] = component;

    if (component.provide) {
      component.provide.forEach(addDependency);
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

    if (!chain) {
      throw new Error('Chain must be generated using buildChain()');

    } else if (typeof this.types[type] === 'undefined') {
      throw new Error('Invalid type ' + type);
    }

    var paths = [],
        root = this.types[type];

    Object.keys(chain).forEach(function(key) {
      var value = chain[key];

      if (value.source && value.source[type]) {
        paths = paths.concat(value.source[type]);
      }
    });

    paths = paths.map(function(value) {
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
    if (typeof this.manifest[key] === 'undefined') {
      throw new Error('Invalid component ' + key);
    }

    var component = this.manifest[key],
        provides = {};

    if (component.provide) {
      component.provide.forEach(function(value) {
        provides[value] = this.manifest[value];
      }.bind(this));
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
    if (typeof this.manifest[key] === 'undefined') {
      throw new Error('Invalid component ' + key);
    }

    var component = this.manifest[key],
        reqs = {};

    if (component.require) {
      component.require.forEach(function(value) {
        reqs[value] = this.manifest[value];
      }.bind(this));
    }

    return reqs;
  };

  // Pass to node
  module.exports = Compartment;

}).call(this);
