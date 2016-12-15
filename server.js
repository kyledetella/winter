/**
 * Example web server to handle Message Send/Receive Webhooks from Init.ai
 *
 * This feature is still in "alpha" and is subject to change.
 */

'use strict'

const restify = require('restify')
const InitClient = require('initai-node')

const server = restify.createServer()
const PORT = process.env.PORT || 4044

const projectLogicScript = require('./behavior/scripts')

server.use(restify.bodyParser())

function sendLogicResult(invocationPayload, result) {
  const invocationData = invocationPayload.invocation_data
  const client = restify.createClient({url: invocationData.api.base_url})

  console.log(':::::::::::::::', invocationData.auth_token)

  const requestConfig = {
    headers: {
      'accept': 'application/json',
      'authorization': `Bearer ${invocationData.auth_token}`,
      'content-type': 'application/json',
    },
    method: 'POST',
    path: `/api/v1/remote/logic/invocations/${invocationData.invocation_id}/result`,
  }

  const resultPayload = {
    invocation: {
      invocation_id: invocationData.invocation_id,
      app_id: invocationPayload.current_application.id,
      app_user_id: Object.keys(invocationPayload.users)[0],
    },
    result: result,
  }

  client.post(requestConfig, (err, req) => {
    if (err) {
      console.error(err)
    }

    req.on('result', (err, res) => {
      res.body = ''
      res.setEncoding('utf8')

      res.on('data', (chunk) => {
        res.body += chunk
      })

      res.on('end', () => {
        console.log(`Result sent successfully`, res.body)
      })
    })

    req.write(JSON.stringify(resultPayload))
    req.end()
  })
}

/**
 * Log any uncaught exceptions for easier debugging
 */
server.on('uncaughtException', (req, res, route, err) => {
  console.error('uncaughtException', err.stack)

  res.send(500)
})

/**
 * Add a POST request handler for webhook invocations
 */
server.post('/', (req, res, next) => {
  const eventType = req.body.event_type
  const eventData = req.body.data

  // Both LogicInvocation and MessageOutbound events will be sent to this handler
  if (eventType === 'LogicInvocation') {
    // The `create` factory expects and the event data and an Object modeled
    // to match AWS Lambda's interface which exposes a `succeed` function.
    // By default, the `done` method on the client instance will call this handler
    const initNodeClient = InitClient.create(eventData, {
      succeed(result) {
        sendLogicResult(eventData.payload, result)
      }
    })

    // An instance of the client needs to be provided to the `handle` method
    // exported from behavior/scripts/index.js to emulate the Lambda pattern
    projectLogicScript.handle(initNodeClient)
  }

  // Immediately return a 200 to acknowledge receipt of the Webhook
  res.send(200)
})

/**
 * Add a "heartbeat" endpoint to ensure server is up
 */
server.get('/heartbeat', (req, res) => {
  res.send('ok')
})

server.listen(PORT, () => {
  console.log('%s listening at %s', server.name, server.url)
})
