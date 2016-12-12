'use strict'

const restify = require('restify')
const InitClient = require('initai-node')

const server = restify.createServer()
const PORT = process.env.PORT || 4044

const projectLogicScript = require('../behavior/scripts')

server.use(restify.bodyParser())

function sendLogicResult(invocationPayload, result) {
  const invocationData = invocationPayload.invocation_data
  const client = restify.createClient({url: invocationData.api.base_url})

  const requestConfig = {
    headers: {
      'accept': 'application/json',
      // TODO: This needs to use the auth token provided in the invocation. If not, we should remove that token from the payload and determine a strategy
      // for developers to include this token when bootstrapping this application
      // 'authorization': `Bearer ${invocationData.auth_token}`,
      'authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBfaWQiOiJiN2ZhYjk5NC02ZTA1LTRlYjgtN2I2Yy05MjQ1ZWMyYjQwNmUiLCJpYXQiOjE0ODE1MDUxODcsImlzcyI6InBsYXRmb3JtIiwidHlwZSI6InJlbW90ZSJ9.25NKt_6xnmWg5PEal6DHhNTXJ5XAJWx-5yMLvO2UV_8`,
      'content-type': 'application/json',
    },
    method: 'POST',
    path: `/api/v1/remote/logic/invocations/${invocationData.invocation_id}/result`,
  }

  const resultPayload = {
    invocation: {
      invocation_id: invocationData.invocation_id,
      app_id: invocationPayload.current_application.id,
      app_user_id: Object.keys(invocationPayload.users)[0], // TODO: This should be configurable by the developer per-invocation
    },
    result: result,
  }

  client.post(requestConfig, (err, req) => {
    if (err) {
      console.log('ERR', err)
      // TODO: Handle error
    }

    req.on('result', (err, res) => {
      res.body = ''
      res.setEncoding('utf8')

      res.on('data', (chunk) => {
        res.body += chunk
      })

      res.on('end', () => {
        console.log(res.body)
      })
    })

    req.write(JSON.stringify(resultPayload))
    req.end()
  })
}

server.on('uncaughtException', (req, res, route, err) => {
  // TODO: Write custom logger output
  console.error('uncaughtException', err.stack)
  res.send(500)
})

/**
 *
 *
 * TODO: ------------------------------------------------
 * The "result" endpoint requires the remote JWT – this will
 * require the developer to provide it as an env var.
 *
 * Should it not just use the jwt from the payload?
 * ______________________________________________________
 *
 */
server.post('/webhooks/logic', (req, res, next) => {
  const eventType = req.body.event_type
  const eventData = req.body.data

  if (eventType === 'LogicInvocation') {
    const initNodeClient = InitClient.create(eventData, {
      succeed(result) {
        sendLogicResult(eventData.payload, result)
      }
    })

    projectLogicScript.handle(initNodeClient)
  }
  res.send(200)
})

server.get('/ping', (req, res) => {
  res.send('ok')
})

server.listen(PORT, () => {
  console.log('%s listening at %s', server.name, server.url)
})
