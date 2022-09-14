import * as acorn from 'acorn';
import * as objectHash from 'object-hash';

function hash(node) {
  return objectHash(node).slice(0, 4).toUpperCase();
}

function processNode(node, { nodes, edges }) {
  if (node.type === 'Literal') {
    nodes.unshift({
      id: `N${hash(node)}`,
      labels: ['Number'],
      properties: JSON.stringify({ value: node.value }),
    });
  }

  if (node.type === 'BinaryExpression') {
    // Determine types for edges based on operator.
    let leftType, rightType;
    switch (node.operator) {
      case '**':
        leftType = 'BASE';
        rightType = 'EXPONENT';
        break;
      case '/':
        leftType = 'DIVIDEND';
        rightType = 'DIVISOR';
        break;
      case '*':
        leftType = 'MULTIPLICAND';
        rightType = 'MULTIPLIER';
        break;
      case '+':
        leftType = 'AUGEND';
        rightType = 'ADDEND';
        break;
      case '-':
        leftType = 'MINUEND';
        rightType = 'SUBTRAHEND';
        break;
    }

    // Add node and left/right edges.
    nodes.unshift({
      id: `N${hash(node)}`,
      labels: ['Number'],
      properties: JSON.stringify({}),
    });
    edges.unshift({
      id: `E${hash(node)}L`,
      type: leftType,
      startNode: `N${hash(node.left)}`,
      endNode: `N${hash(node)}`,
      properties: '{}',
    });
    edges.unshift({
      id: `E${hash(node)}R`,
      type: rightType,
      startNode: `N${hash(node.right)}`,
      endNode: `N${hash(node)}`,
      properties: '{}',
    });

    // Recursively process left/right nodes.
    processNode(node.left, { nodes, edges });
    processNode(node.right, { nodes, edges });
  }
}

export function convertArithmeticExpressionToQuery(graphId: string, expression: string) {
  let ast;
  let query = [];
  let nodes = [];
  let edges = [];

  // Parse AST, return blank arrays if failed.
  try {
    ast = acorn.parse(expression, { ecmaVersion: 2020 });
  } catch (e: unknown) {
    return null;
  }

  // Get ExpressionStatement from AST.
  if (ast.body[0].type == 'ExpressionStatement') {
    let statement = ast.body[0];
  } else {
    return null;
  }

  // Recursively populate nodes and edges arrays.
  processNode(ast.body[0].expression, { nodes, edges });

  // Add query lines for nodes.
  for (const node of nodes) {
    let id = node.id;
    let labels = node.labels.join(':');

    // Add graphId to node properties.
    let properties = JSON.parse(node.properties || '{}');
    properties.graphId = graphId;

    // Format key/value pairs in properties.
    let formattedProperties = [];
    for (const key in properties) {
      formattedProperties.push(`${key}: ${JSON.stringify(properties[key])}`);
    }

    if (formattedProperties.length > 1) {
      query.push(`MERGE (${id}:${labels} {${formattedProperties.join(', ')}})`);
    } else {
      query.push(`CREATE (${id}:${labels} {${formattedProperties.join(', ')}})`);
    }
  }

  // Add query lines for edges.
  for (const edge of edges) {
    let { id, type, startNode, endNode } = edge;

    // Add graphId to node properties.
    let properties = JSON.parse(edge.properties || '{}');
    properties.graphId = graphId;

    // Format key/value pairs in properties.
    let propertiesString = [];
    for (const key in properties) {
      propertiesString.push(`${key}: ${JSON.stringify(properties[key])}`);
    }

    query.push(`CREATE (${startNode})-[${id}:${type} {${propertiesString.join(', ')}}]->(${endNode})`);
  }

  return query;
}
