import AWS from 'aws-sdk'
import { db } from 'luno-core'

import logger from '../../../core/logger'
import postToWebhook from '../../../core/postToWebhook'
import { getUsers } from '../../../core/slack'

AWS.config.setPromisesDependency(Promise)

async function getMessage(team) {
  const users = await getUsers(team.slack.bot.token)
  let createdBy
  const accounts = []
  const members = []
  const restrictedMembers = []
  const bots = []
  for (let member of users.members) {
    accounts.push(member)
    if (member.id === team.createdBy) {
      createdBy = member
    }

    if (!member.deleted) {
      if (member.is_restricted) {
        restrictedMembers.push(member)
      } else if (member.is_bot) {
        bots.push(member)
      } else if (member.name !== 'slackbot') {
        members.push(member)
      }
    }
  }

  let website
  const domain = createdBy.profile.email.split('@')[1]
  if (domain) {
    website = `http://www.${domain}`
  }

  const attachment = {
    fallback: 'Team Info',
    fields: [
      {
        title: 'Website',
        value: website,
        short: true,
      },
      {
        title: 'Total Active Members',
        value: members.length,
        short: true,
      },
      {
        title: 'Total Bots',
        value: bots.length,
        short: true,
      },
      {
        title: 'Total Restricted Members',
        value: restrictedMembers.length,
        short: true,
      },
      {
        title: 'Total Accounts',
        value: accounts.length,
        short: true,
      },
    ],
  }

  const message = {
    icon_emoji: ':cubimal_chick:',
    username: 'sns-bot',
    text: `New Team, *${team.name}*, has been created (${team.id})`,
    attachments: [attachment],
    channel: process.env.SLACK_CHANNEL,
  }
  return message
}

export default async (event, context) => {
  for (const record of event.Records) {
    let teamId
    try {
      teamId = JSON.parse(record.Sns.Message).teamId
    } catch (err) {
      logger.error('Error parsing payload', { payload: record.Sns.Message, err })
      continue
    }

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

    let message
    try {
      message = await getMessage(team)
    } catch (err) {
      logger.error('Error fetching message', { team, err })
      continue
    }

    try {
      await postToWebhook(JSON.stringify(message), process.env.WEBHOOK_URL)
    } catch (err) {
      logger.error('Error posting message', { err, message, url: process.env.WEBHOOK_URL })
    }
  }
}

