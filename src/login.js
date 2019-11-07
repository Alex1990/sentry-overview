const debug = require('debug')('sentry-overview:login')
const request = require('request-promise')
const cheerio = require('cheerio')
const setCookie = require('set-cookie-parser')
const config = require('../config.js')

async function getLoginData () {
  return {
    username: config.username,
    password: config.password
  }
}

module.exports = async function login () {
  const { username, password } = await getLoginData()
  const loginUrl = `${config.sentryUrl}/auth/login/${config.org}/`
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
  const csrfmiddlewaretoken = $('input[name="csrfmiddlewaretoken"]').val()
  const op = 'login'
  const postData = {
    csrfmiddlewaretoken,
    op,
    username,
    password
  }
  debug('cookies', cookies)
  debug('postData', postData)
  let authData = null
  try {
    await request({
      method: 'post',
      url: loginUrl,
      headers: {
        Referer: loginUrl,
        Cookie: `sc=${cookies.sc.value.trim()}; sentrysid=${cookies.sentrysid.value.trim()}`
      },
      form: postData,
      followRedirect: false
    })
  } catch (err) {
    if (err.statusCode === 302) {
      const { sc, sudo, sentrysid } = setCookie(err.response, {
        decodeValues: true,
        map: true
      })
      authData = {
        sc: sc.value,
        sudo: sudo.value,
        sentrysid: sentrysid.value
      }
    } else {
      if (err.response) {
        console.log(err.response)
      }
      throw err
    }
  }
  debug('authData', authData)
  return authData
}
