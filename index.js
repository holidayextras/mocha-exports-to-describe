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

      if (properties[i].expression.arguments[0].type == "Identifier") {
        properties[i].expression.arguments[0] = {
          type: "Literal",
          value: properties[i].expression.arguments[0].name.replace(/[\"\']/g,""),
          raw: "'" + properties[i].expression.arguments[0].name.replace(/[\"\']/g,"") + "'"
        };
      }

      checkFixTree(n2.properties);
      continue;
    }

    // Before/After
    if ( (n1.type == "Property")
         && (((n1.key || { }).name || (n1.key || { }).value || '').match(/^'?"?(before|after|beforeEach|afterEach)'?"?$/))) {
      properties[i] = {
        "type": "ExpressionStatement",
        "expression": {
          "type": "CallExpression",
          "callee": {
            "type": "Identifier",
            "name": n1.key.value || n1.key.name
          },
          "arguments": [ n1.value ]
        }
      };
      continue;
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

      if (properties[i].expression.arguments[0].type == "Identifier") {
        properties[i].expression.arguments[0] = {
          type: "Literal",
          value: properties[i].expression.arguments[0].name.replace(/[\"\']/g,""),
          raw: "'" + properties[i].expression.arguments[0].name.replace(/[\"\']/g,"") + "'"
        };
      }
      continue;
    }
  }
};

var files = process.argv;
files.shift(); files.shift();
files.forEach(function(filePath) {
  console.log("Processing", filePath);
  var code = fs.readFileSync(filePath);

  var astTree = esprima.parse(code, {range: true, tokens: true, comment: true});
  astTree = escodegen.attachComments(astTree, astTree.comments, astTree.tokens);
  convertType(astTree);
  // console.log(JSON.stringify(astTree,null,2))
  var newCode = escodegen.generate(astTree, { comment: true, format: { indent: { style: '  ' } } });
  newCode = newCode.replace(/^( *(describe|it|before|after|beforeEach|afterEach)\()/gmi, "\n$1");

  fs.writeFileSync(filePath, newCode);
});
