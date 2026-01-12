+++
title = "Troubleshooting"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 13
+++

## API base URLs

If your backend is hosted on a domain with a path (for example,
localhost:8000/api), ensure VITE_API_BASE_URL is set correctly. If the URL does
not end with a slash, redirections may occur.

## Documenting with JSDoc

JSDoc cannot fully parse TypeScript-style import syntax. Instead of:

```js
/**
 * @param {import('../myfolder/myfile.js').MyType} myParam
 */
```

use the type name. For React components, either export the component after its
definition or annotate with @function and @constructor:

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
