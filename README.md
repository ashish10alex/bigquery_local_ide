
# BigQuery Local IDE

A web based ide for BigQuery that can be launched from your local setup build with good old javascript

![CleanShot 2024-07-23 at 21 52 51@2x](https://github.com/user-attachments/assets/6a82e907-77a4-4430-8569-86fac9a222b6)


Supports

1. vim key bindings
2. Display & analyse results using [perspective](https://perspective.finos.org) tables
3. Shows query cost & errors if any

TODO:

- [x] Dynamic dry runs when contents of editor are changed or when user triggers dry run ?
- [ ] Run a selection. Can make it work when selection is done in non-vim mode. ( this was easier in Code Mirror v5 )
- [ ] Mark the line where error is in the editor gutter ( this was easier in Code Mirror v5 )
- [ ] Resolve weird wasm error ( does not seem to affect the core functionality )
- [ ] Theme of the editor should match the theme of the table and the page
- [ ] Enable the vertical resize of the editor

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

