import request from 'request'
import Bluebird from 'bluebird'

export default Bluebird.promisify(request.post, { multiArgs: true })
