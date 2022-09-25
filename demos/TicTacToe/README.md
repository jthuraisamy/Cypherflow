# Tic-Tac-Toe Demo

## Assumptions

To understand the actual intended purpose this demo serves, some suspension of disbelief would be appropriate with the following assumptions:

- Consistent and immutable rules for maximizing reward (winning) do not exist.

## Tasks

| Name            | Fireable When                        | Computed When                        |
|:----------------|:-------------------------------------|--------------------------------------|
| InitializeBoard | ![](https://i.imgur.com/XElN4ZR.png) | ![](https://i.imgur.com/lXpDVvJ.png) |
| PlaceMark       | ![](https://i.imgur.com/a5VAz0T.png) | ![](https://i.imgur.com/Kb4N46k.png) |

> Note: Each task can output only one node (green) and any edges associated with it.

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

Visually, the submitted graph looks like this:

![](https://imgur.com/BdIu92w.png)

After the write query is executed in the Submissions DB, a message is published in the `CreateGraph` channel to trigger tasking:

```json
{
  "id": "01GDV0PDH3G4V37SP3VS0YX6CX",
  "expression": "{\"board\":[0,0,0,0,0,0,0,0,0],\"move\":\"X0\"}"
}
```

Any service subscribing to that channel can check to see whether its included tasks can participate in each submitted graph. [For each task](/src/index.ts#L175), the service scans the graph for eligible output nodes that the task can potentially generate. Specifically, it is looking for nodes that match the expected output labels and do not appear to be in a *computed* state (a lifecycle term we will circle back to). The number of output nodes determines how many instances of the task should be spun-up for this graph.

In this case, the `GameService` iterates through two tasks: `InitializeBoard` and `PlaceMark`. For each task, two instances are created because both nodes in the submission match the expected output label (`Board`) and do not appear to be in a computed state (as per the specification diagrams [above](#tasks)). With four tasks in total being created, we can start to track their lifecycles and the dataflow-like interactions they have toward the outcome of contributing to the experience graph.
