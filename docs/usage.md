# Compartment #

Compartment is part dependency graph, part component manager, part package builder, all handled through a manifest file. The manifest simply stores a list of components and their dependency on other components from the same manifest. Compartment provides an easy mechanism to create custom packaging builds with resolution for file types, system paths, and requirements.

## Installation ##

Compartment requires Node.js and NPM, so be sure to install those ahead of time. To begin, add compartment to your projects `package.json` dependency list.

```javascript
"compartment": "*"
```

Open the command line, `cd` into the project directory, and run the following command.

```bash
npm install
```

Include the library into a Node script by using require. This will return a class which can be used to instantiate objects.

```javascript
var Compartment = require('compartment');
var graph = new Compartment();
```

## Defining Types ##

Each component will have a mapping of sources to specific data types. When defining a type, an optional source path may be included. This source path will be prepended to component paths while building a chain.

To add types, use `addType()` or `addTypes()`.

```javascript
graph.addType('html');
graph.addTypes({
    css: '/src/css/',
    js: '/src/js/'
});
```

## Managing Components ##

To make use of Compartment, a list of components and their dependencies must be added. There are two ways to do this, first by loading an external manifest JSON file, and secondly by manually adding them.

Each component must have a unique key and a mapping of special properties. Each property handles a specific role in the graph building process. The following properties are available.

* `category` (string|array) - The type of component (can be used for filtering)
* `requires` (array) - List of component names that this component requires
* `provides` (array) - List of component names that this component includes
* `priority` (int) - The priority level in which to sort components in the chain
* `source` (object) - An object mapping of types (defined above) to a list of values

A manifest file must contain a mapping of components in JSON format. To load an external manifest file, use `loadManifest()`. To clear the manifest of all components, use `clearManifest()`.

```javascript
graph.loadManifest(__dirname + '/path/to/manifest.json');
graph.clearManifest();
```

To set components manually, or to add to the manifest after a load has occurred, use `addComponent()` or `addComponents()`. To remove a component, use `removeComponent()`.

```javascript
// addComponent(name, category, source, require, provide, priority)
graph.addComponent('modal', 'ui', { 
    css: ['modal.css'],
    js: ['modal.js'],
}, ['blackout']);

// addComponents(object)
graph.addComponents({
    tooltip: {
        category: 'ui',
        priority: 3,
        source: {
            css: ['tooltip.css'],
            js: ['tooltip.js']
        }
    },
    popover: {
        category: 'ui',
        require: ['tooltip'],
        priority: 4,
        source: {
            css: ['popover.css'],
            js: ['popover.js']
        }
    },
    button: {
        category: 'ui',
        provide: ['buttonGroup'],
        priority: 1,
        source: {
            css: ['button.css']
        }
    },
    buttonGroup: {
        category: 'ui',
        require: ['button'],
        priority: 2,
        source: {
            css: ['button-group.css']
        }
    }
});

graph.removeComponent('popover');
```

## Building Chains ##

After components and types have been set, the chain can be built and graphed out. What this does is loop through the requested components (by name), resolve their dependencies (require and provide), sort the results (by priority) and return a chain of components. This chain can then be interacted with to extract source path information.

Using the example above, one can build a new chain and request the popover component. When doing this, the tooltip component will be included first since it's a requirement.

```javascript
graph.buildChain('popover'); // tooltip, popover
```

All components can be built by passing an empty argument. A list of components can be built by passing an array of names.

```javascript
graph.buildChain(); // button, buttonGroup, tooltip, popover, modal
graph.buildChain(['tooltip', 'modal']); // tooltip, modal
```

Components can be filtered down even more by passing a category as the second argument. The category can either be a string or an array.

```javascript
graph.buildChain(['tooltip', 'button'], 'ui'); // tooltip
```

Once a chain is built, one can use `getPaths()` to return a list of paths which is the sum of all components in the chain by a specific type.

```javascript
graph.buildChain();
graph.getPaths('css'); // ['/src/css/button.css', '/src/css/button-group.css', '/src/css/tooltip.css', '/src/css/popover.css', '/src/css/modal.css']
graph.getPaths('js'); // ['/src/js/tooltip.js', '/src/js/popover.js', '/src/js/modal.js']
```
