
# BigQuery Local IDE

A web based ide for BigQuery that can be launched from your local setup build with good old javascript

Supports

1. vim key bindings
2. Display & analyse results using [perspective](https://perspective.finos.org) tables
3. Shows query cost & errors if any

TODO:

- [ ] Dynamic dry runs when contents of editor are changed or when user triggers dry run ?
- [ ] Mark the line where error is in the editor gutter ( this was easier in Code Mirror v6 )
- [ ] Resolve weird wasm error ( does not seem to affect the core functionality )

# Installation & run

1. Install dependencies for client and server

```bash
npm install server/
npm install client/
# build client
npm build client/
```

2. Start server

```bash
node server/server.js
```

3. Serve client

```bash
http-server client/dist
```

