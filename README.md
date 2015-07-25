
# Convert mocha exports tests to describe

This project will convert a mocha test that uses the `exports` syntax into one that uses the describe syntax.

Getting started:
```
$ npm install esprima escodegen
```

It converts one file at a time:
```
$ node index.js /absolute/path/to/test.js
```

or it can be run over an entire codebase like this:
```
$ cd folder/of/this/project
$ find /absolute/path/to/test/folder/ -name "*.js" -exec node index.js {} \;
```
