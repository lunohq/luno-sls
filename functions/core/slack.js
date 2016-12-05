import Bluebird from 'bluebird'
import request from 'request'

const post = Bluebird.promisify(request.post, { multiArgs: true })
const API_ROOT = 'https://slack.com/api'

async function callAPI({ endpoint, form }) {
  let [result, body] = await post(endpoint, { form })
  body = JSON.parse(body)
  if (!body.ok) {
    throw new Error('Unsuccessful response from slack', body)
  }
  return body
}

export function getUsers(token) {
  return callAPI({ endpoint: `${API_ROOT}/users.list`, form: { token }})
}

export async function getUserInfo(token, user) {
  return callAPI({ endpoint: `${API_ROOT}/users.info`, form: { token, user }})
}

export async function getUserAttachment(team, user) {
  const info = await getUserInfo(team.slack.bot.token, user.id)
  const text = `New User: ${info.user.name} (${info.user.profile.email})`
  const attachment = {
    fallback: text,
    pretext: text,
    fields: [
      {
        title: 'ID',
        value: user.id,
        short: true,
      },
      {
        title: 'Email',
        value: info.user.profile.email,
        short: true,
      },
      {
        title: 'Slack Admin',
        value: info.user.is_admin,
        short: true,
      },
      {
        title: 'Slack Owner',
        value: info.user.is_owner,
        short: true,
      },
    ],
  }

  if (info.user.profile.real_name) {
    attachment.fields.push(
      {
        title: 'Name',
        value: info.user.profile.real_name,
        short: true,
      }
    )
  }

  if (info.user.profile.title) {
    attachment.fields.push(
      {
        title: 'Title',
        value: info.user.profile.title,
        short: true,
      }
    )
  }
  return attachment
}
