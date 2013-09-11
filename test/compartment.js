/**
 * @copyright Copyright 2013, Miles Johnson - http://milesj.me
 * @license   http://opensource.org/licenses/mit-license.php
 * @link      http://milesj.me/code/nodejs/compartment
 */

(function() {
  'use strict';

process.env.NODE_ENV = "testing";

var _ = require('lodash');
var expect = require('chai').expect;
var compartment = require('../lib/compartment');

beforeEach(function() {
  compartment.clearManifest();
});

describe('Compartment', function() {

  describe('building', function() {
    var manifest = {
      a: {
        category: 'lib',
        source: {
          css: ['a.css']
        }
      },
      b: {
        category: 'lib',
        require: ['a'],
        source: {
          css: ['b.css']
        }
      },
      c: {
        category: 'lib',
        source: {
          css: ['c.css']
        }
      },
      d: {
        category: 'lib',
        require: ['a'],
        source: {
          css: ['d.css']
        }
      },
      e: {
        category: 'lib',
        provide: ['f'],
        source: {
          css: ['e.css']
        }
      },
      f: {
        category: 'lib',
        source: {
          css: ['f.css']
        }
      },
      g: {
        category: 'tmp',
        source: {
          js: ['g.js']
        }
      },
      h: {
        category: 'tmp',
        require: ['b', 'e'],
        source: {
          css: ['h.css'],
          js: ['g.js']
        }
      }
    };

    it('should build using the whitelist and resolve dependencies', function() {
      compartment.setManifest(manifest);

      var tree = compartment.buildTree(['h']).tree;

      expect(tree).to.deep.equal({
        a: {
          category: 'lib',
          source: {
            css: ['a.css']
          },
          name: 'a'
        },
        b: {
          category: 'lib',
          require: ['a'],
          source: {
            css: ['b.css']
          },
          name: 'b'
        },
        e: {
          category: 'lib',
          provide: ['f'],
          source: {
            css: ['e.css']
          },
          name: 'e'
        },
        f: {
          category: 'lib',
          source: {
            css: ['f.css']
          },
          name: 'f'
        },
        h: {
          category: 'tmp',
          require: ['b', 'e'],
          source: {
            css: ['h.css'],
            js: ['g.js']
          },
          name: 'h'
        }
      });
    });

    it('should build all when no argument passed', function() {
      compartment.setManifest(manifest);

      var tree = compartment.buildTree().tree;

      expect(_.keys(tree)).to.deep.equal(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    });

    it('should filter by category', function() {
      compartment.setManifest(manifest);

      var tree = compartment.buildTree(null, 'tmp').tree;

      expect(tree).to.deep.equal({
        g: {
          category: 'tmp',
          source: {
            js: ['g.js']
          },
          name: 'g'
        },
        h: {
          category: 'tmp',
          require: ['b', 'e'],
          source: {
            css: ['h.css'],
            js: ['g.js']
          },
          name: 'h'
        }
      });
    });

    it('should order by number', function() {
      compartment.addComponents({
        a: {
          category: 'lib',
          order: 3,
          source: {
            css: ['a.css']
          }
        },
        b: {
          category: 'lib',
          order: 8,
          require: ['a'],
          source: {
            css: ['b.css']
          }
        },
        c: {
          category: 'lib',
          order: 2,
          source: {
            css: ['c.css']
          }
        }
      });

      var tree = compartment.buildTree().tree;

      // TODO SORTING
      //expect(_.keys(tree)).to.deep.equal(['c', 'a', 'b']);
    });

    it('should return the correct type paths', function() {
      compartment.setManifest(manifest);
      compartment.addType('js', '/js/');
      compartment.addType('css', '/css/');

      var paths = compartment.buildTree('h').getPaths('css');

      expect(paths).to.deep.equal([
        '/css/a.css',
        '/css/b.css',
        '/css/e.css',
        '/css/f.css',
        '/css/h.css'
      ]);

      paths = compartment.getPaths('js');

      expect(paths).to.deep.equal([
        '/js/g.js'
      ]);
    });
  });

  describe('types', function() {
    it('should store the path', function() {
      compartment.addType('js', '/path');

      expect(compartment.types.js).to.equal('/path');
    });

    it('should default to empty string if no path', function() {
      compartment.addType('css');

      expect(compartment.types.css).to.equal('');
    });

    it('should add multiple types', function() {
      compartment.addTypes({
        foo: '/foo',
        bar: '/bar'
      });

      expect(compartment.types).to.deep.equal({
        js: '/path',
        css: '',
        foo: '/foo',
        bar: '/bar'
      });
    });
  });

  describe('components', function() {
    it('should allow for adding components to the manifest', function() {
      compartment.addComponent('baz', 'html');

      expect(compartment.manifest).to.deep.equal({
        baz: {
          name: 'baz',
          category: 'html',
          require: [],
          provide: [],
          order: null,
          source: {}
        }
      });
    });

    it('should add multiple components', function() {
      compartment.addComponents({
        foo: {
          category: 'css',
          require: ['bar'],
          provide: ['baz'],
          order: 1,
          source: {
            css: ['/css/']
          }
        },
        bar: {
          category: 'js',
          require: [],
          provide: ['baz'],
          order: 2,
          source: {
            css: ['/js/']
          }
        }
      });

      expect(compartment.manifest).to.deep.equal({
        foo: {
          category: 'css',
          require: ['bar'],
          provide: ['baz'],
          order: 1,
          source: {
            css: ['/css/']
          }
        },
        bar: {
          category: 'js',
          require: [],
          provide: ['baz'],
          order: 2,
          source: {
            css: ['/js/']
          }
        }
      });
    });

    it('should remove a component', function() {
      compartment.addComponent('wtf', 'css');
      compartment.removeComponent('wtf');

      expect(compartment.manifest.wtf).to.be.an('undefined');
    });
  });

});

}).call(this);