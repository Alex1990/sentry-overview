const debug = require('debug')('sentry-overview:index')
const Table = require('cli-table')
const chalk = require('chalk')
const config = require('../config')
const fetch = require('./fetch')

async function getOverviewData ({
  project,
  since,
  resolution = '1d',
  showDays = 7
}) {
  const dayDuration = 24 * 3600 * 1000
  const now = new Date()
  let sinceValue = since
  if (!sinceValue) {
    sinceValue = (now.getTime() - (30 + showDays) * dayDuration) / 1000
  }
  const url = `${config.sentryUrl}/api/0/projects/${config.org}/${project}/stats/?since=${sinceValue}&resolution=${resolution}&stat=generated`
  const data = await fetch({ url })
  const overview = []
  const getInitDatum = () => ({
    lastDay: 0,
    lastWeek: 0,
    lastMonth: 0
  })
  const len = data.length

  for (let i = showDays; i > 0; i--) {
    const datum = getInitDatum()
    datum.lastDay = data.slice(len - i - 1, len - i).reduce((s, v) => {
      s += v[1]
      return s
    }, 0)
    datum.lastWeek = data.slice(len - (i + 7), len - i).reduce((s, v) => {
      s += v[1]
      return s
    }, 0)
    datum.lastMonth = data.slice(len - (i + 30), len - i).reduce((s, v) => {
      s += v[1]
      return s
    }, 0)
    overview.push(datum)
  }
  debug('get overview data: ', overview.slice(0, 10))
  return overview
}

function printOverview (overview) {
  const tableData = [
    ['Last 1 Day'].concat(overview.map(v => v.lastDay)),
    ['Last 7 Days'].concat(overview.map(v => v.lastWeek)),
    ['Last 30 Days'].concat(overview.map(v => v.lastMonth))
  ]
  const head = overview.map((v, i) => `-${overview.length - i}d`)
  head.unshift('')
  const table = new Table({
    head,
    colWidths: [20].concat(Array(overview.length).fill(10))
  })
  table.push(...tableData)
  console.log(table.toString())
}

async function main () {
  for (const project of config.projects) {
    const data = await getOverviewData({ project })
    console.log(`${chalk.green(project)}`)
    printOverview(data)
  }
}

main()
