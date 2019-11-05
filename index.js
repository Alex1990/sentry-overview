const inquirer = require('inquirer')
const request = require('request-promise')
const cheerio = require('cheerio')
const setCookie = require('set-cookie-parser')
const Table = require('cli-table')
const chalk = require('chalk')

const questions = [
  {
    type: 'input',
    name: 'username',
    message: 'Please input your sentry username'
  },
  {
    type: 'password',
    name: 'password',
    mask: '*',
    message: 'Please input your sentry password'
  }
]

async function getLoginData () {
  return inquirer.prompt(questions)
}

async function login () {
  const { username, password } = await getLoginData()
  const loginUrl = 'https://sentry2.maka.im/auth/login/maka/'
  const res = await request({
    method: 'get',
    url: loginUrl,
    resolveWithFullResponse: true,
    encoding: null
  })
  const $ = cheerio.load(res.body)
  const cookies = setCookie(res, {
    decodeValues: true,
    map: true
  })
  console.log(Object.keys(res))
  const csrfmiddlewaretoken = $('input[name="csrfmiddlewaretoken"]').val()
  const op = 'login'
  const postData = {
    csrfmiddlewaretoken,
    op,
    username,
    password
  }
  console.log('postData:')
  console.log(postData)
  console.log(`sc: "${cookies.sc.value}"`)
  const res1 = await request({
    method: 'post',
    url: loginUrl,
    headers: {
      Referer: loginUrl,
      Cookie: `sc=${cookies.sc.value.trim()}`
    },
    data: postData,
  })
  const cookies1 = setCookie(res1, {
    decodeValues: true,
    map: true
  })
}

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
  const data = await request({
    method: 'get',
    url: `https://sentry2.maka.im/api/0/projects/maka/${project}/stats/?since=${sinceValue}&resolution=${resolution}&stat=generated`,
    headers: {
      Referer: `https://sentry2.maka.im/maka/${project}/dashboard`,
      Cookie: 'sc=HCh6AALWqQ2CC2Q9qX29wrr7v4eW1exY; sudo="pRP8QiqjiXGx:1iOwtr:hG0V8mihdjgtlkZM5kZJA13C0CY"; sentrysid=".eJxNjbsKwjAYhVstBUURfAQnp6Cbq4oUdPFCIFuJSah_0yZtLl4GwUc3ioPbufGdV-fZxlM8zKl3l9xbYXLguxHuUebgKrQpSBJFUU0lbTs4sZ5rMghBc9wvDtCWQLI76YfACeuY1hIESYO9aSMFx-M_7pkyKRTHEyuUMw_kHVQWfXq0qSlUy6BWv03XWk3iwJnjNFdaMfF9XUM2K09229S68OgNLbM8XA:1iOyTn:3Mpr-DcDhAt9nTMYXkJ6M4KTI_Q"'
    },
    json: true
  })
  const overview = []
  const getInitDatum = () => ({
    lastDay: 0,
    lastWeek: 0,
    lastMonth: 0
  })
  const len = data.length

  for (let i = showDays; i > 0; i--) {
    const datum = getInitDatum()
    datum.lastDay = data.slice(len - i - 1, len - i).reduce((s, v) => s += v[1], 0)
    datum.lastWeek = data.slice(len - (i + 7), len - i).reduce((s, v) => s += v[1], 0)
    datum.lastMonth = data.slice(len - (i + 30), len - i).reduce((s, v) => s += v[1], 0)
    overview.push(datum)
  }

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

  console.log(`${chalk.green(project)}`)
  console.log(table.toString())
}

async function main () {
  const projects = [
    'store2-web',
    'store2-node',
    'store3-web',
    'store3-node'
  ]
  for (const project of projects) {
    await getOverviewData({
      project,
    })
  }
}

main()
