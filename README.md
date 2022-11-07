# lighthouse-plugin-user-flow-metrics

Lighthouse plugin for auditing custom performance metrics.

## Usage

```sh
npm install -D lighthouse-plugin-user-flow-metrics
```

Add the plugin to your [Lighthouse configuration](https://github.com/GoogleChrome/lighthouse/blob/main/docs/configuration.md):

```javascript
module.exports = {
  extends: 'lighthouse:default',
  settings: {
    plugins: ['lighthouse-plugin-user-flow-metrics'],
  },
}
```

Instrument your code with marks and measures:

```javascript
performance.mark('start work')
// do some work
performance.measure('My heavy work', 'start work')
```

Run Lighthouse configured with this plugin on your page to get custom performance metrics.

## Screenshots

<img src="https://user-images.githubusercontent.com/489018/200261182-9832ea93-6768-449b-a07a-8aac446368cc.png" alt="report example" />
