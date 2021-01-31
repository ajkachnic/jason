# `jason`

`jason` is a JSON parser and formatter written in JavaScript. It's pretty simple (208 lines with comments and blank lines) and should be pretty fast. It uses [`moo`](https://github.com/no-context/moo) for lexing, and then iterates over that stream of tokens. It supports proper strings, floats, and some pretty errors. It's kinda pointless because `JSON.parse` exists, but interesting nonetheless.

## install

```sh
npm install @ajkachnic/jason
```

## usage

You can selectively import the functions you want using destructuring

Here's a typescript example:

```typescript
import { parse, format, beautify } from '@ajkachnic/jason'
```

And here's a commonjs version:

```javascript
const { parse, format, beautify } = require('@ajkachnic/jason')
```

## api

### `parse`

`parse` takes a string and returns it's JavaScript equivalent.

Example:

```javascript
const output = parse('{ "name": "bob", "age": 28.5 }') // { name: "bob", age: 28.5 }
```

### `format`

`format` takes a JavaScript value and returns it's JSON encoded counterpart. Please only pass this things that will be properly encoded (class instances and stuff won't be)

It also has a second optional argument for whether or not to pretty-print. This is set to false by default

Example:

```javascript
const json = format({ name: "bob", age: 28.5 }) // {"name":"bob","age":28.5}
```

### `beautify`

`beautify` takes a JSON string and returns a pretty-printed version. It basically just parses it and then runs `format` on it with pretty printing enabled. It's probably not very fast

Example:

```javascript
const beautified = beautify('{"name":"bob","age":28.5}') // { "name": "bob", "age": 28.5 }
```
