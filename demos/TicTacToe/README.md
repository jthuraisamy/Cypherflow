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

### Graph Submission

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

### Instantiating Tasks

After the write query is executed in the Submissions DB, a message is published in the `CreateGraph` channel to trigger tasking:

```json
{
  "id": "01GDV0PDH3G4V37SP3VS0YX6CX",
  "expression": "{\"board\":[0,0,0,0,0,0,0,0,0],\"move\":\"X0\"}"
}
```

Any service subscribing to that channel can check to see whether its [supported tasks](/demos/TicTacToe/GameService/src/main.ts#L14) can participate in each submitted graph. [For each task](/src/index.ts#L175), the service scans the graph for eligible output nodes that the task can potentially generate. Specifically, it is looking for nodes that [match](/src/tasking/BaseTask.ts#L533) the expected output labels and do not appear to be in a *computed* state (a lifecycle term we will circle back to). The number of found nodes determines how many instances of the task should be spun-up for this graph.

In this case, the `GameService` iterates through two tasks: `InitializeBoard` and `PlaceMark`. For each task, two instances are created because both nodes in the submission match the expected output label (`Board`) and do not appear to be in a computed state (as per the specification diagrams [above](#tasks)).

### Task Lifecycle

With a total of four tasks being created, we can step through their lifecycles and the dataflow-like interactions they have toward the outcome of contributing to the experience graph. Recall that the lifecycle for tasks looks like this:

```mermaid
stateDiagram-v2
    direction LR
    
    [*] --> Instantiated
    Instantiated --> Eligible
    Instantiated --> NotEligible
    NotEligible --> [*]
    Eligible --> Fireable
    Fireable --> Cached
    Cached --> [*]
    Fireable --> Computing
    Computing --> Aborted
    Aborted --> [*]
    Computing --> Computed
    Computed --> [*]
```

| Task Type       | Task ID                      | Output Node ID | Status       |
|:----------------|:-----------------------------|:---------------|:-------------|
| InitializeBoard | `01GDV0PDK6JSPJ02T9CVB7JX2P` | 0              | Instantiated |
| InitializeBoard | `01GDV0PDK9E0MME36AA0CFK18F` | 1              | Instantiated |
| PlaceMark       | `01GDV0PDKJ5BGSQTSTEC8XGYKJ` | 0              | Instantiated |
| PlaceMark       | `01GDV0PDKK8AQX83D5P23HY22Y` | 1              | Instantiated |

At this initial point, all the tasks have been instantiated, and the next step for each task is call the `isEligible()` function. Although each output node appears to be a candidate the task can compute, we also need to know whether the input specifications for the task match with the output node.

Consider the Submission DB queries below that check the eligibility of the two `PlaceMark` tasks. The first one will fail to match because there are no nodes that connect toward node #0. The second one will successfully match because node #0 is a `Board` node that connects toward node #1 (also `Board`) with a `NEXT_MOVE` relationship. 

```cypher
2022-09-26T01:00:19.719Z - PlaceMark(01GDV0PDKJ5BGSQTSTEC8XGYKJ) | MATCH (old:Board)-[move:NEXT_MOVE]->(new:Board)
2022-09-26T01:00:19.719Z - PlaceMark(01GDV0PDKJ5BGSQTSTEC8XGYKJ) | WHERE ID(new) = 0
2022-09-26T01:00:19.719Z - PlaceMark(01GDV0PDKJ5BGSQTSTEC8XGYKJ) | RETURN old, move, new;

2022-09-26T01:00:19.835Z - PlaceMark(01GDV0PDKJ5BGSQTSTEC8XGYKJ) | MATCH (old:Board)-[move:NEXT_MOVE]->(new:Board)
2022-09-26T01:00:19.835Z - PlaceMark(01GDV0PDKJ5BGSQTSTEC8XGYKJ) | WHERE ID(new) = 1
2022-09-26T01:00:19.835Z - PlaceMark(01GDV0PDKJ5BGSQTSTEC8XGYKJ) | RETURN old, move, new;
```

Another way to think about the eligibility check is to visualize whether the "shape" of the task can be laid over each candidate output node:

| Task Type       | Task ID                      | Visual                               | Status      |
|:----------------|:-----------------------------|:-------------------------------------|:------------|
| PlaceMark       | `01GDV0PDKJ5BGSQTSTEC8XGYKJ` | ![](https://i.imgur.com/DZK3wek.png) | NotEligible |
| PlaceMark       | `01GDV0PDKK8AQX83D5P23HY22Y` | ![](https://i.imgur.com/Hij3WEx.png) | Eligible    |