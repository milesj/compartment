/**
 * @copyright Copyright 2013, Miles Johnson - http://milesj.me
 * @license   http://opensource.org/licenses/mit-license.php
 * @link      http://milesj.me/code/nodejs/compartment
 */

(function() {
  'use strict';

process.env.NODE_ENV = "testing";

var _ = require('lodash'),
    expect = require('chai').expect,
    comp = require('../lib/compartment'),
    compartment;

beforeEach(function() {
  compartment = new comp();
  compartment.clearManifest();
});

describe('Compartment', function() {

  describe('building', function() {
    it('should build using the whitelist and resolve dependencies', function() {
      compartment.loadManifest(__dirname + '/manifest.json');

      var chain = compartment.buildChain(['h']).chain;

      expect(chain).to.deep.equal({
        a: {
          category: 'lib',
          source: {
            css: ['a.css']
          },
          key: 'a'
        },
        b: {
          category: 'lib',
          require: ['a'],
          source: {
            css: ['b.css']
          },
          key: 'b'
        },
        e: {
          category: 'lib',
          provide: ['f'],
          source: {
            css: ['e.css']
          },
          key: 'e'
        },
        f: {
          category: 'lib',
          source: {
            css: ['f.css']
          },
          key: 'f'
        },
        h: {
          category: 'tmp',
          require: ['b', 'e'],
          source: {
            css: ['h.css'],
            js: ['g.js']
          },
          key: 'h'
        }
      });
    });

    it('should build all when no argument passed', function() {
      compartment.loadManifest(__dirname + '/manifest.json');

      var chain = compartment.buildChain().chain;

      expect(_.keys(chain)).to.deep.equal(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    });

    it('should filter by category', function() {
      compartment.loadManifest(__dirname + '/manifest.json');

      var chain = compartment.buildChain(null, 'tmp').chain;

      expect(chain).to.deep.equal({
        g: {
          category: 'tmp',
          source: {
            js: ['g.js']
          },
          key: 'g'
        },
        h: {
          category: 'tmp',
          require: ['b', 'e'],
          source: {
            css: ['h.css'],
            js: ['g.js']
          },
          key: 'h'
        }
      });

      chain = compartment.buildChain('h', ['lib', 'tmp']).chain;

      expect(_.keys(chain)).to.deep.equal(['a', 'b', 'e', 'f', 'h']);
    });

    it('should sort by priority', function() {
      compartment.addComponents({
        a: {
          category: 'lib',
          priority: 3,
          source: {
            css: ['a.css']
          }
        },
        b: {
          category: 'lib',
          priority: 8,
          require: ['a'],
          source: {
            css: ['b.css']
          }
        },
        c: {
          category: 'lib',
          priority: 2,
          source: {
            css: ['c.css']
          }
        }
      });

      var chain = compartment.buildChain().chain;

      expect(_.keys(chain)).to.deep.equal(['c', 'a', 'b']);
    });

    it('should return the correct type paths', function() {
      compartment.loadManifest(__dirname + '/manifest.json');
      compartment.addType('js', '/js/');
      compartment.addType('css', '/css/');

      var paths = compartment.buildChain('h').getPaths('css');

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

    it('should not fail on components with no sources', function() {
      compartment.addComponents({
        a: {
          category: 'foo'
        },
        b: {
          category: 'bar',
          source: {
            js: ['b.js']
          }
        }
      }).addType('js');

      var paths = compartment.buildChain().getPaths('js');

      expect(paths).to.deep.equal(['b.js'])
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
          priority: null,
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
          priority: 1,
          source: {
            css: ['/css/']
          }
        },
        bar: {
          category: 'js',
          require: [],
          provide: ['baz'],
          priority: 2,
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
          priority: 1,
          source: {
            css: ['/css/']
          }
        },
        bar: {
          category: 'js',
          require: [],
          provide: ['baz'],
          priority: 2,
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

    it('should return requires', function() {
      compartment.loadManifest(__dirname + '/manifest.json');

      expect(compartment.getRequires('h')).to.deep.equal({
        b: {
          category: 'lib',
          require: ['a'],
          source: {
            css: ['b.css']
          }
        },
        e: {
          category: 'lib',
          provide: 'f',
          source: {
            css: ['e.css']
          }
        }
      })
    });

    it('should return provides', function() {
      compartment.loadManifest(__dirname + '/manifest.json');

      expect(compartment.getProvides('e')).to.deep.equal({
        f: {
          category: 'lib',
          source: {
            css: ['f.css']
          }
        }
      })
    });
  });

});

}).call(this);