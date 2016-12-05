import url from 'url'
import AWS from 'aws-sdk'
import { db } from 'luno-core'
import Bluebird from 'bluebird'

import logger from '../../core/logger'
import post from '../../core/post'

AWS.config.setPromisesDependency(Bluebird.Promise)
const ENDPOINT = 'https://slack.com/api/files.upload'
const s3 = new AWS.S3()

function logTime(action, start, end) {
  const took = (end - start) / 1000
  logger.info(`Action: "${action}" took: ${took} seconds`)
}

export default async (event, context) => {
  let start
  let end

  logger.info('Fetching team')
  start = Date.now()
  let team
  try {
    team = await db.team.getTeam(event.teamId)
  } catch (err) {
    logger.error('Error fetching team', { event, err })
    throw err
  }
  end = Date.now()
  logTime('fetch team', start, end)

  logger.info('Retrieving file')
  start = Date.now()
  let file
  try {
    const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: event.key,
    }
    file = await s3.getObject(params).promise()
  } catch (err) {
    logger.error('Error retrieving file', { err, event, params })
    throw err
  }
  end = Date.now()
  logTime('retrieve file', start, end)

  logger.info('Uploading to slack')
  start = Date.now()
  let body
  try {
    const formData = {
      channels: event.channelId,
      token: team.slack.bot.token,
      file: {
        value: file.Body,
        options: {
          filename: file.Metadata.name,
          knownLength: file.ContentLength,
          contentType: file.ContentType,
        },
      },
    }
    const result = await post(ENDPOINT, { formData })
    body = result[1]
  } catch (err) {
    logger.error('Error uploading file to slack', { err, event, file })
    throw err
  }
  end = Date.now()
  logTime('upload file to slack', start, end)

  try {
    body = JSON.parse(body)
  } catch (err) {
    logger.error('Error parsing response from slack', { err, body })
    throw err
  }

  if (!body.ok) {
    logger.error('Upload to slack failed', { body })
    return
  }

  if (!body.file.is_public) {
    logger.error('Uploaded file isn\'t public', { file })
    return
  }

  const { permalink } = body.file
  const parsed = url.parse(permalink)
  const parts = parsed.path.slice(1).split('/')
  parts[1] = team.slack.bot.userId
  body.file.permalink = `${parsed.protocol}//${parsed.host}/${parts.join('/')}`
  return body.file
}
