import logger from '../../../core/logger'
import postToWebhook from '../../../core/postToWebhook'

export default async (event, context) => {
  for (const record of event.Records) {
    let event
    try {
      event = JSON.parse(record.Sns.Message)
    } catch (err) {
      logger.error('Error parsing sns message', { err, record })
    }
    const message = {
      icon_emoji: ':cubimal_chick:',
      username: 'empire',
      text: `*[${process.env.SERVERLESS_STAGE}]* ${event.Message}`,
    }

    try {
      await postToWebhook(JSON.stringify(message), process.env.WEBHOOK_URL)
    } catch (err) {
      logger.error('Error posting slack message', { err, message, env: process.env })
    }
  }
}
