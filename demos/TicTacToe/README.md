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

### JsonExpression

The following JSON gets parsed to create the following graph for engine submission:

```json
{
  "board": [0, 0, 0, 0, 0, 0, 0, 0, 0],
  "move": "X0"
}
```

![](https://imgur.com/jwdIj4E.png)