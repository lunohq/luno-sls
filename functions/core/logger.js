import util from 'util'
import raven from 'raven'

const client = new raven.Client(process.env.SENTRY_DSN)
client.patchGlobal()
client.setExtraContext({
  project: process.env.SERVERLESS_PROJECT,
  stage: process.env.SERVERLESS_STAGE,
  function: process.env.SERVERLESS_FUNCTION,
})

export default {
  log(message, ...args) {
    console.log(message, util.inspect(args, { depth: 4 }))
  },
  info(message, payload) {
    const args = [message]
    if (payload) {
      args.push(util.inspect(payload, { depth: 4 }))
    }
    console.info(...args)
  },
  error(message, payload) {
    const { err, ...other } = payload
    if (err) {
      other.err = {
        stack: err.stack,
        message: err.message,
      }
    }
    client.captureMessage(message, { extra: other })
    console.error(message, util.inspect(payload, { depth: 4 }))
  },
}
