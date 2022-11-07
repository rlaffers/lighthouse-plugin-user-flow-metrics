# lighthouse-plugin-user-flow-metrics

Lighthouse plugin for auditing custom performance metrics.

<img src="https://user-images.githubusercontent.com/489018/200261182-9832ea93-6768-449b-a07a-8aac446368cc.png" alt="report example" />

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

Create a budget file:

```json
{
  "measurement_page::form_disabled": 1700,
  "measurement_page::render": 20,
  "measurement_page::change_of_tq_unit": 1000,
  "user_input::increase_value_by_btn": 10
}
```

Let the plugin know where your budget file is located:

```javascript
process.env.LIGHTHOUSE_USER_FLOW_BUDGETS = '/path/to/budget/file'
```

Instrument your code with marks and measures:

```javascript
performance.mark('start work')
// do some work
performance.measure('My heavy work', 'start work')
```

Run Lighthouse configured with this plugin on your page to get custom performance metrics.
