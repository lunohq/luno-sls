import post from './post'

export default async function(payload, url) {
  const [result, body] = await post(url, { form: { payload } })
  if (body !== 'ok') {
    throw new Error('Posting to webhook failed', body)
  }
  return body
}
