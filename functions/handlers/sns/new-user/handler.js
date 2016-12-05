import AWS from 'aws-sdk'
import { db } from 'luno-core'

import logger from '../../../core/logger'
import postToWebhook from '../../../core/postToWebhook'
import { getUserAttachment } from '../../../core/slack'

AWS.config.setPromisesDependency(Promise)

async function getMessage(team, user) {
  const message = {
    icon_emoji: ':cubimal_chick:',
    username: 'sns-bot',
    text: `New user signed up for *${team.name}* (${team.id})`,
    attachments: [],
    channel: process.env.SLACK_CHANNEL,
  }

  let attachment
  try {
    attachment = await getUserAttachment(team, user)
  } catch (err) {
    logger.error('Error fetching info for user', { user, err })
  }

  if (attachment) {
    message.attachments.push(attachment)
  }

  return message
}

export default async (event, context) => {
  for (const record of event.Records) {
    let data
    try {
      data = JSON.parse(record.Sns.Message)
    } catch (err) {
      logger.error('Error parsing payload', { payload: record.Sns.Message, err })
      continue
    }

    const { teamId, userId } = data

    let team
    try {
      team = await db.team.getTeam(teamId)
    } catch (err) {
      logger.error('Error fetching team', { teamId, err })
      continue
    }

    if (!team) {
      logger.error('No team returned', { teamId })
      continue
    }

    let user
    try {
      user = await db.user.getUser(userId)
    } catch (err) {
      logger.error('Error fetching user', { userId, teamId, err })
    }

    if (!user) {
      logger.error('No user returned', { userId, teamId, user, err })
      continue
    }

    let message
    try {
      message = await getMessage(team, user)
    } catch (err) {
      logger.error('Error fetching message', { team, user, err })
      continue
    }

    try {
      await postToWebhook(JSON.stringify(message), process.env.WEBHOOK_URL)
    } catch (err) {
      logger.error('Error posting message', { err, message, url: process.env.WEBHOOK_URL })
    }
  }
}

