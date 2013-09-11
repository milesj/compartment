/**
 * @copyright Copyright 2013, Miles Johnson - http://milesj.me
 * @license   http://opensource.org/licenses/mit-license.php
 * @link      http://milesj.me/code/nodejs/component-tree
 */

var _ = require('lodash');

function ComponentTree() {
  var manifest = {},
      types = {},
      tree = {};

  /**
   * Add a file type to include as a source lookup path.
   *
   * @param {String} type
   * @param {String} path
   * @returns {ComponentTree}
   */
  this.addType = function (type, path) {
    types[type] = path || '';

    return this;
  };

  /**
   * Add multiple file types.
   *
   * @param {Object} types
   * @returns {ComponentTree}
   */
  this.addTypes = function (types) {
    _.forEach(types, function eachTypes(value, key) {
      types[key] = value;
    });

    return this;
  };

  /**
   * Set the entire manifest at once.
   *
   * @param {Object} data
   * @returns {ComponentTree}
   */
  this.setManifest = function (data) {
    manifest = data;

    return this;
  };

  /**
   * Reset the manifest to empty.
   *
   * @returns {ComponentTree}
   */
  this.resetManifest = function () {
    manifest = {};

    return this;
  };

  /**
   * Add an item manually to the manifest.
   *
   * @param {String} key
   * @param {String} category
   * @param {Object} source
   * @param {Array} require
   * @param {Array} provide
   * @param {Number} order
   * @returns {ComponentTree}
   */
  this.addItem = function (key, category, source, require, provide, order) {
    manifest[key] = {
      name: key,
      category: category,
      require: require || [],
      provide: provide || [],
      order: order || null,
      source: source
    };

    return this;
  };

  /**
   * Remove an item from the manifest.
   *
   * @param {String} key
   * @returns {ComponentTree}
   */
  this.removeItem = function (key) {
    delete manifest[key];

    return this;
  };

  /**
   * Generate a component tree from a list of components.
   * If components is empty, use the entire manifest.
   * Can filter down items based on category.
   *
   * @param {String|Array} components
   * @param {String} category
   * @returns {ComponentTree}
   */
  this.buildTree = function (components, category) {
    if (!components) {
      components = _.keys(manifest);

    } else if (!_.isArray(components)) {
      components = components.split(',');
    }

    tree = {};

    // Add dependencies from components list
    _.forEach(components, this.addDependency);

    // Filter out invalid category
    if (category) {
      _.forEach(tree, function filterCategory(value, key) {
        if (!value.category || value.category !== category) {
          delete tree[key];
        }
      });
    }

    // Sort the tree order
    var sortedTree = _.sortBy(tree, function sortTree(value) {
      if (value.order) {
        return Math.sin(value.order);
      }

      return -1;
    });

    tree = {};

    _.forEach(sortedTree, function rebuildTree(value, key) {
      tree[value.name] = value;
    });

    return this;
  };

  /**
   * Resolve any dependencies between components and add them to the tree.
   *
   * @param {String} key
   * @returns {ComponentTree}
   */
  this.addDependency = function (key) {
    if (!manifest[key]) {
      throw new Error('Invalid component ' + key);
    }

    var component = manifest[key];
        component.name = key;

    if (component.require) {
      _.forEach(component.require, this.addDependency);
    }

    tree[key] = component;

    if (component.provide) {
      _.forEach(component.provide, this.addDependency);
    }

    return this;
  };

  /**
   * Return the manifest.
   *
   * @returns {Object}
   */
  this.getManifest = function () {
    return manifest;
  };

  /**
   * Return the generated tree.
   *
   * @returns {Object}
   */
  this.getTree = function () {
    return tree;
  };

  /**
   * Return a list of paths that are the sum of all the components in the tree.
   * Will append the type path to each item in the list.
   *
   * @param {String} type
   * @returns {Array}
   */
  this.getPaths = function (type) {
    if (!tree.length) {
      throw new Error('Tree must be generated using buildTree()');

    } else if (!types[type]) {
      throw new Error('Invalid type ' + type);
    }

    var paths = [],
        root = types[type];

    _.forEach(tree, function eachPaths(value, key) {
      if (value.source[type]) {
        _.union(paths, value.source[type]);
      }
    });

    return _.map(paths, function mapPaths(value) {
      return root + value;
    });
  };
}

// Pass to node
module.exports = new ComponentTree();