import express from 'express';
import { readFileSync } from 'fs';
import { createServer } from '@graphql-yoga/node';
import { resolvers } from './resolvers';

// Create Express app.
const app = express();

// Serve Vue front-end.
app.use(express.static('../dist'));

// Create GraphQL server.
app.use(
  '/graphql',
  createServer({
    schema: {
      typeDefs: readFileSync('./schema.graphql', 'utf-8'),
      resolvers,
    },
  })
);

// Listen on port 4000.
app.listen(4000, () => {
  console.log('Running WebService at http://localhost:4000.');
});
