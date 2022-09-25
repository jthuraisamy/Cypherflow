# Tic-Tac-Toe Demo

## Assumptions

Suspending

- Consistent and immutable rules for maximizing reward (winning) do not exist.

## Tasks

| Name            | Diagram of Fireable Conditions       |
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

The channel has a consumer in `GameService` which receives it and passes it to the designated parser (`JsonExpression`). The parser creates the following graph for engine submission:

```json
MERGE (old:Board {value: "[0,0,0,0,0,0,0,0,0]", graphId: "01GDV0PDH3G4V37SP3VS0YX6CX"})
CREATE (new:Board {graphId: "01GDV0PDH3G4V37SP3VS0YX6CX"})
CREATE (old)-[move:NEXT_MOVE {value: "X0", graphId: "01GDV0PDH3G4V37SP3VS0YX6CX"}]->(new)
```

As you can see, a `graphId` (ULID) is generated for each node and edge to help distinguish the submissions in the database. Currently, the board is serialized as a string because the AST transform function does not support arrays (to be resolved later). 

Visually, the graph looks like this:

![](https://imgur.com/jwdIj4E.png)