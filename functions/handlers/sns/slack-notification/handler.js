import logger from '../../../core/logger'
import postToWebhook from '../../../core/postToWebhook'

export default async (event, context) => {
  for (const record of event.Records) {
    const payload = record.Sns.Message
    try {
      await postToWebhook(payload, process.env.WEBHOOK_URL)
    } catch (err) {
      logger.error('Error posting slack message', { err, payload })
    }
  }
}
