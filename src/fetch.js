const debug = require('debug')('sentry-overview:req')
const _ = require('lodash')
const request = require('request-promise')
const login = require('./login')

let authData = null

module.exports = async function fetch (options) {
  if (!authData) {
    authData = await login()
  }
  const authCookie = _.map(authData, (v, k) => `${k}=${v}`).join('; ')
  debug(`fetch ${options.method} ${options.url}`)
  return request({
    method: 'get',
    json: true,
    ...options,
    headers: {
      ...(options.headers || {}),
      Referer: login.sentryUrl,
      Cookie: authCookie
    }
  })
}
