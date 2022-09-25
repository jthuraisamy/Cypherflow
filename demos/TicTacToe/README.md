# Tic-Tac-Toe Demo

## Assumptions

Suspending

- Consistent and immutable rules for maximizing reward (winning) do not exist.

## Tasks

| Name            | Fireable When                        |
|:----------------|:-------------------------------------|
| InitializeBoard | ![](https://i.imgur.com/izK8q6R.png) |
| PlaceMark       | ![](https://i.imgur.com/pvhgMHM.png) |

## Expression Parsers

| Name           | Example                                                  |
|:---------------|:---------------------------------------------------------|
| JsonExpression | `{ "board": [0, 0, 0, 0, 0, 0, 0, 0, 0], "move": "X0" }` |

## Detailed Walkthrough

A player is starting a new game and intends to place X in position 0:

![](https://i.imgur.com/jqktzH2.png)

The intention is translated to a `submitMove` mutation request via the GraphQL API:

```graphql
mutation {
  submitMove(board: [0, 0, 0, 0, 0, 0, 0, 0, 0], move: "X0")
}
```

The resolver for this mutation publishes the arguments to the `SubmitExpression` channel in Redis PubSub:

```json
{
  "board": [0, 0, 0, 0, 0, 0, 0, 0, 0],
  "move": "X0"
}
```

The channel has a consumer in `GameService` which receives it and passes it to the designated parser, `JsonExpression`. The parser creates the following query for submission to the engine:

```cypher
MERGE (old:Board {value: "[0,0,0,0,0,0,0,0,0]", graphId: "01GDV0PDH3G4V37SP3VS0YX6CX"})
CREATE (new:Board {graphId: "01GDV0PDH3G4V37SP3VS0YX6CX"})
CREATE (old)-[move:NEXT_MOVE {value: "X0", graphId: "01GDV0PDH3G4V37SP3VS0YX6CX"}]->(new)
```

As you can see, each node and edge is tagged with  a `graphId` ([ULID](https://github.com/ulid/spec)) to help distinguish the submissions in the database. Currently, the board is serialized as a string because the AST transform function does not support arrays (to be resolved later). 

Visually, the graph looks like this:

![](https://imgur.com/jwdIj4E.png)

After the write query is executed in the Submissions DB, a message is published in the `CreateGraph` channel to trigger tasking:

```json
{
  "id": "01GDV0PDH3G4V37SP3VS0YX6CX",
  "expression": "{\"board\":[0,0,0,0,0,0,0,0,0],\"move\":\"X0\"}",
  "nodes": [ ... ],
  "edges": [ ... ]
}
```

Any service subscribing to that channel can check to see whether its included tasks can participate in each submitted graph.