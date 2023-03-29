import { Audit } from 'lighthouse'
import fs from 'fs'

let budgets = {}
if (process.env.LIGHTHOUSE_USER_FLOW_BUDGETS) {
  const json = fs.readFileSync(process.env.LIGHTHOUSE_USER_FLOW_BUDGETS, 'utf8')
  budgets = JSON.parse(json)
}

const add = (x, y) => x + y

function sortByTimestamp(arr) {
  const indices = Object.keys(arr)
  indices.sort((indexA, indexB) => {
    const result = arr[indexA].ts - arr[indexB].ts
    return result || indexA - indexB
  })
  const sorted = []
  for (let i = 0; i < indices.length; i += 1) {
    sorted.push(arr[indices[i]])
  }
  return sorted
}

function aggregateTimings(userTimings) {
  return userTimings.reduce((res, ut) => {
    if (res[ut.name] === undefined) {
      res[ut.name] = []
    }
    res[ut.name].push(ut.duration)
    return res
  }, {})
}

function sumRelevantBudgets(timingsByName, allBudgets) {
  return Object.keys(timingsByName).reduce(
    (tot, name) => tot + (allBudgets[name] ? allBudgets[name] : 0),
    0,
  )
}

function evaluateUserTimings(userTimings) {
  const timingsByName = aggregateTimings(userTimings)
  const totalRelevantBudget = sumRelevantBudgets(timingsByName, budgets)

  return Object.entries(timingsByName).map(([name, durations]) => {
    const maxDuration = Math.max(...durations)
    const budget = budgets[name]
    const overrun = budget === undefined ? 0 : Math.max(maxDuration - budget, 0)
    const penalty = budget === undefined ? 0 : overrun / budget
    return {
      name,
      count: durations.length,
      maxDuration,
      avgDuration: durations.reduce(add, 0) / durations.length,
      budget,
      overrun,
      penalty,
      weightedPenalty:
        budget !== undefined && totalRelevantBudget
          ? penalty * (budget / totalRelevantBudget)
          : penalty,
    }
  })
}

class UserFlowMetricsAudit extends Audit {
  static get meta() {
    return {
      id: 'user-flow-metrics',
      title: 'User flow budgets were met.',
      failureTitle: 'User flow budgets were overrun.',
      description:
        "Exceeding the configured user flow budgets indicates that the performance may have deteriorated from the user's perspective.",
      requiredArtifacts: ['traces'],
      scoreDisplayMode: 'numeric',
    }
  }

  static audit({ traces }) {
    // Get all blink.user_timing events
    // The event phases we are interested in are mark and instant events (R, i, I)
    // and duration events which correspond to measures (B, b, E, e).
    // @see https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview#
    const userTimings = []
    const measuresStartTimes = {}

    sortByTimestamp(
      traces.defaultPass.traceEvents.filter((evt) => {
        if (!evt.cat.includes('blink.user_timing')) {
          return false
        }

        // reject these "userTiming" events that aren't really UserTiming, by nuking ones with frame data (or requestStart)
        // https://cs.chromium.org/search/?q=trace_event.*?user_timing&sq=package:chromium&type=cs
        return (
          evt.name !== 'requestStart' &&
          evt.name !== 'navigationStart' &&
          evt.name !== 'paintNonDefaultBackgroundColor' &&
          evt.args.frame === undefined
        )
      }),
    ).forEach((ut) => {
      // Mark events fall under phases R and I (or i)
      if (ut.ph === 'R' || ut.ph.toUpperCase() === 'I') {
        // marks are not interesting at the moment
        // userTimings.push({
        //   name: ut.name,
        //   isMark: true,
        //   args: ut.args,
        //   startTime: (ut.ts = 1000),
        // })
      } else if (ut.ph.toLowerCase() === 'b') {
        // Beginning of measure event, keep track of this events start time
        measuresStartTimes[ut.name] = ut.ts
      } else if (ut.ph.toLowerCase() === 'e') {
        // End of measure event
        userTimings.push({
          name: ut.name,
          isMark: false,
          args: ut.args,
          startTime: measuresStartTimes[ut.name] / 1000,
          endTime: ut.ts / 1000,
          duration: (ut.ts - measuresStartTimes[ut.name]) / 1000,
        })
      }
    })

    const metrics = evaluateUserTimings(userTimings)

    const countBudgetOverruns = metrics.reduce(
      (count, ut) => (ut.overrun > 0 ? count + 1 : count),
      0,
    )

    const score = Math.max(
      1 - metrics.reduce((tot, x) => tot + x.weightedPenalty, 0),
      0,
    )

    return {
      score,
      scoreDisplayMode: 'numeric',
      // explanation: 'some explanation', // always shown, but in red color on failure
      displayValue: `${metrics.length - countBudgetOverruns}/${
        metrics.length
      } metrics are within their budgets (Score: ${score.toFixed(2)})`, // shown in green on success, red on warning/error
      // If this is present, it replaces the explanation, the title is as if the audit has passed.
      // It is meant for displaying runtime errors from this audit
      // @link https://github.com/GoogleChrome/lighthouse/blob/main/types/lhr/audit-details.d.ts
      details: {
        type: 'table',
        headings: [
          {
            key: 'name',
            itemType: 'text',
            text: 'Name of time interval',
          },
          {
            key: 'count',
            itemType: 'numeric',
            text: 'Samples',
          },
          {
            key: 'maxDuration',
            itemType: 'ms',
            text: 'Max duration',
            granularity: 0.01,
          },
          {
            key: 'avgDuration',
            itemType: 'ms',
            text: 'Average duration',
            granularity: 0.01,
          },
          {
            key: 'budget',
            itemType: 'ms',
            text: 'Budget',
          },
          {
            key: 'overrun',
            itemType: 'ms',
            text: 'Over budget',
            displayUnit: 'ms',
            granularity: 1,
          },
          {
            key: 'weightedPenalty',
            itemType: 'numeric',
            text: 'Penalty',
            granularity: 0.001,
          },
        ],
        items: metrics,
      },
    }
  }
}

export default UserFlowMetricsAudit
