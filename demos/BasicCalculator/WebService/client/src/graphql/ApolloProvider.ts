import { ApolloLink, Operation, FetchResult, Observable, ApolloClient, InMemoryCache } from '@apollo/client/core';
import { split } from '@apollo/client/link/core';
import { HttpLink } from '@apollo/client/link/http';
import { createApolloProvider } from '@vue/apollo-option';
import { print, getOperationAST } from 'graphql';

type SSELinkOptions = EventSourceInit & { uri: string };

class SSELink extends ApolloLink {
  constructor(private options: SSELinkOptions) {
    super();
  }

  request(operation: Operation): Observable<FetchResult> {
    const url = new URL(this.options.uri);
    url.searchParams.append('query', print(operation.query));
    if (operation.operationName) {
      url.searchParams.append('operation', JSON.stringify(operation.operationName));
    }
    if (operation.variables) {
      url.searchParams.append('variables', JSON.stringify(operation.variables));
    }
    if (operation.extensions) {
      url.searchParams.append('extensions', JSON.stringify(operation.extensions));
    }

    return new Observable((sink) => {
      this.options.withCredentials = true;
      const eventsource = new EventSource(url.toString(), this.options);
      eventsource.onmessage = function (event) {
        const data = JSON.parse(event.data);
        sink.next(data);
        if (eventsource.readyState === 2) {
          sink.complete();
        }
      };
      eventsource.onerror = function (error) {
        sink.error(error);
      };
      return () => eventsource.close();
    });
  }
}

// @ts-ignore
const uri = window.__DEV__
  ? `${window.location.protocol}//${window.location.hostname}:4000/graphql`
  : `${window.location.origin}/graphql`;

const sseLink = new SSELink({ uri });
const httpLink = new HttpLink({ uri });
const splitLink = split(
  ({ query, operationName }) => {
    const definition = getOperationAST(query, operationName);
    return definition?.kind === 'OperationDefinition' && definition.operation === 'subscription';
  },
  sseLink,
  httpLink
);

export const apolloProvider = createApolloProvider({
  defaultClient: new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
  }),
});
