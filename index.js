var fs = require("fs");
var path = require("path");
var esprima = require("esprima");
var escodegen = require("escodegen");

var convertType = function(tree) {
  tree.body.pop();
  for (var i=0; i<tree.body.length; i++) {
    var n1 = tree.body[i];
    if ((n1.type == "ExpressionStatement") &&
        (n1.expression.type == "AssignmentExpression") &&
        (n1.expression.operator == "=") &&
        (((n1.expression.left || { }).object || { }).name == "module") &&
        (((n1.expression.left || { }).property || { }).name == "exports") ) {
      checkFixTree(tree.body[i].expression.right.properties);
      tree.body = tree.body.concat(tree.body[i].expression.right.properties);
      tree.body.splice(i, 1);
      return;
    }
  }
};

var checkFixTree = function(properties) {
  for (var i = 0; i<properties.length; i++) {
    var n1 = properties[i];
    var n2 = (n1.value || { });

    // Describe block
    if ((n1.type == "Property") && (n2.type == "ObjectExpression")) {
      properties[i] = {
        "type": "ExpressionStatement",
        "expression": {
          "type": "CallExpression",
          "callee": {
            "type": "Identifier",
            "name": "describe"
          },
          "arguments": [
            n1.key,
            {
              "type": "FunctionExpression",
              "id": null,
              "params": [],
              "defaults": [],
              "body": {
                "type": "BlockStatement",
                "body": n2.properties
              }
            }
          ]
        }
      };
      checkFixTree(n2.properties);
      continue;
    }

    // Before/After
    if ((n1.type == "Property") && (((n1.key || { }).name || '').match(/^before|after/))) {
      properties[i] = {
        "type": "ExpressionStatement",
        "expression": {
          "type": "CallExpression",
          "callee": {
            "type": "Identifier",
            "name": "beforeEach"
          },
          "arguments": [ n1.value ]
        }
      };
      continue
    }

    // It block
    if ((n1.type == "Property") && (n2.type == "FunctionExpression")) {
      properties[i] = {
        "type": "ExpressionStatement",
        "expression": {
          "type": "CallExpression",
          "callee": {
            "type": "Identifier",
            "name": "it"
          },
          "arguments": [
            n1.key,
            n2
          ]
        }
      };
      continue;
    }
  }
};

var files = process.argv;
files.shift(); files.shift();
files.forEach(function(filePath) {
  var code = fs.readFileSync(filePath);

  var astTree = esprima.parse(code);
  convertType(astTree);
  var newCode = escodegen.generate(astTree, { format: { indent: { style: '  ' } } });
  newCode = newCode.replace(/^( *(describe|it|before|after|beforeEach|afterEach))/gmi, "\n$1");

  fs.writeFileSync(filePath, newCode);
});
