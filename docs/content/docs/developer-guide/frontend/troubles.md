+++
title = "Troubleshooting"
date = "2025-03-05T12:55:52+01:00"
linkTitle = "Troubleshooting"
draft = false
weight = 3
+++

## API Base URLs

If your backend is hosted on a domain with a path (e.g., `localhost:8000/api`), ensure that the environment variable (`VITE_API_BASE_URL`) is correctly set. Note that if the URL does not end with a slash, redirections may occur.

## Documenting with JSDoc

JSDoc cannot fully parse TypeScript-style import syntax. Instead of:

```js
/**
 * @param {import('../myfolder/myfile.js').MyType} myParam
 */
```

simply use the type name. For React components, either export the component after its definition or annotate with `@function` and `@constructor`:

```jsx
/**
 * @function MyComponent
 * @param {Object} props
 * @param {MyType1} props.prop1
 * @param {MyType2} props.prop2
 * @returns {JSX.Element}
 * @constructor
 */
export default function MyComponent({ prop1, prop2 }) {
  // ...
}
```

## Prettier

Code formatting is managed by [Prettier](https://prettier.io/). The configuration file is located in `.prettierrc`.

Run Prettier with:

```shell
npm run prettier
```
