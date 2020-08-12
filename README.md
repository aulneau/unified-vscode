# unified-vscode

This is a code highlighter plugin for remark and rehype (you should probs use the rehype one), currently still in progress.
I do not recommend you use this yet. This is using a fork of `shiki` for code highlighting, eventually will hopefully use
a different VS code highlighter.

## Local Development

Below is a list of commands you will probably find useful.

### `npm start` or `yarn start`

Runs the project in development/watch mode. Your project will be rebuilt upon changes. TSDX has a special logger
for you convenience. Error messages are pretty printed and formatted for compatibility VS Code's Problems tab.

Your library will be rebuilt if you make edits.

### `npm run build` or `yarn build`

Bundles the package to the `dist` folder.
The package is optimized and bundled with Rollup into multiple formats (CommonJS, UMD, and ES Module).
