# Compartment v0.2.0 #

Compartment is part dependency graph, part component manager, part package builder, all handled through a manifest file.
The manifest simply stores a list of components and their dependency on other components from the same manifest.
Compartment provides an easy mechanism to create custom packaging builds with resolution for file types, system paths, and requirements.

### Intro ###

Compartment was built to handle the dependencies for front-end files, like CSS and JS.
It allows components to define source paths for multiple file types, making it really easy to customize and package.
However, Compartment is pretty abstract and can be used in any way possible.

### Usage ###

Require the module and instantiate a new instance.

```javascript
var compartment = require('compartment'),
    graph = new compartment();
```

Define the types of files the graph will support.

```javascript
graph.addTypes({
    css: '/src/css/',
    js: '/src/js/'
});
```

Either load the list of components from a manifest file, or define manually. Each component supports the following properties:

* name - Name of component
* category - The type of component
* require - A list of other components that this component requires
* provide - A list of other components that this component includes
* priority - The order in which to sort components in the chain
* source - An object mapping of types (defined above) to a list of values

```javascript
graph.loadManifest('path/to/manifest.json');

graph.addComponents({
    button: {
        category: 'component',
        source: {
            css: ['button.css']
        }
    },
    buttonGroup: {
        category: 'component',
        require: ['button'],
        source: {
            css: ['button-group.css']
        }
    },
    modal: {
        category: 'component',
        source: {
            css: ['modal.css'],
            js: ['modal.js']
        }
    }
});
```

Build a chain of components (or all) with optional category filtering.

```javascript
graph.buildChain(); // all
graph.buildChain(['buttonGroup']); // build buttonGroup and dependencies
graph.buildChain(null, 'component'); // filter all by category
```

Return a merged list of sources based on the type.

```javascript
graph.buildChain(['buttonGroup']).getPaths('css');
// ['/src/css/button.css', '/src/css/button-group.css']
```

### Running Tests ###

Run the following command in the project root to run all tests.

```bash
mocha
```