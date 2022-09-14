# Cypherflow

An execution engine that incorporates dataflow concepts using the Cypher Query Language.

Execution results are cached in a property graph for future querying. Should no results return for a given subgraph, an appropriately formed one will serve as a declarative expression for reification through tasking in a dataflow-like manner.


## Usage

```sh
# Clone repository.
git clone https://github.com/jthuraisamy/Cypherflow.git
cd ./Cypherflow/demos/BasicCalculator

# Run application via Docker Compose.
sudo docker-compose up --build

# Visit http://localhost:4000 in browser.
```

## Access

- Calculator Demo: http://localhost:4000
- Redis Console: http://localhost:4001
- Generator Memgraph: http://localhost:4002
- Discriminator Memgraph: http://localhost:4003