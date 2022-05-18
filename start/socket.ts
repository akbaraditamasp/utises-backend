import Database from '@ioc:Adonis/Lucid/Database'
import Ws from 'App/Services/Ws'
import crypto from 'crypto'
import { Socket } from 'socket.io'
Ws.boot()

/**
 * Listen for incoming socket connections
 */

function urlDecode(encoded) {
  return Buffer.from(encoded, 'base64').toString('utf-8')
}

function generateHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function parseToken(token) {
  const parts = token.split('.')
  /**
   * Ensure the token has two parts
   */
  if (parts.length !== 2) {
    throw new Error('E_INVALID_API_TOKEN')
  }

  /**
   * Ensure the first part is a base64 encode id
   */
  const tokenId = urlDecode(parts[0])

  if (!tokenId) {
    throw new Error('E_INVALID_API_TOKEN')
  }

  const parsedToken = generateHash(parts[1])
  return {
    token: parsedToken,
    tokenId,
  }
}

async function checkToken(token: string): Promise<void> {
  const parsedToken = parseToken(token)
  const apiToken = await Database.query()
    .select('user_id')
    .from('api_tokens')
    .where('id', parsedToken.tokenId)
    .andWhere('token', parsedToken.token)
    .first()
  if (!apiToken) {
    throw new Error('E_INVALID_API_TOKEN')
  }
}

async function authenticate(socket: Socket): Promise<void> {
  const token = socket.handshake?.auth?.token

  if (!token || typeof token !== 'string') {
    throw new Error('MISSING_PARAMETER')
  }

  try {
    await checkToken(token)
  } catch (error) {
    throw new Error('BAD_CREDENTIAL')
  }
}

Ws.io.use((socket, next) => {
  ;(async () => {
    try {
      await authenticate(socket)
      next()
    } catch (e) {
      next(e)
    }
  })()
})

Ws.io.on('connection', (socket) => {
  socket.on('join', (room) => {
    socket.join(room)
  })
})
