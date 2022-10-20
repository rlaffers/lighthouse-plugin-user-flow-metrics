module.exports = {
  audits: [{ path: 'lighthouse-plugin-user-flow-metrics/audits/user-flow-metrics' }],

  category: {
    title: 'User Flow Performance',
    description: 'Performance for custom user actions described by puppeteer scripts',
    auditRefs: [{ id: 'user-flow-metrics', weight: 1 }],
  },
}
