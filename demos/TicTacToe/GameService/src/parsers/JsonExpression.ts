interface MoveExpression {
  board: number[];
  move: string;
}

function createQuery(graphId, nodes, edges) {
  let query = [];

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

    // Add graphId to edge properties.
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

export function convertJsonExpressionToQuery(graphId: string, expression: string) {
  // Deserialize JSON string into MoveExpression type.
  const move = JSON.parse(expression) as MoveExpression;

  // Define nodes.
  const nodes = [
    {
      id: 'old',
      labels: ['Board'],
      properties: JSON.stringify({ value: JSON.stringify(move.board) }),
    },
    {
      id: 'new',
      labels: ['Board'],
      properties: '{}',
    },
  ];

  // Define edge.
  const edges = [
    {
      id: 'move',
      type: 'NEXT_MOVE',
      startNode: 'old',
      endNode: 'new',
      properties: JSON.stringify({ value: move.move }),
    },
  ];

  // Return query lines.
  return createQuery(graphId, nodes, edges);
}
