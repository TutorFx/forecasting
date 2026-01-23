import { drizzle } from 'drizzle-orm/node-postgres'
import { SQL } from 'bun'

import * as schema from '../../server/database/schema'

export { sql, eq, and, or, desc } from 'drizzle-orm'

export const tables = schema

export function useDrizzle() {
  const {
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_HOSTNAME,
    POSTGRES_PORT,
    POSTGRES_DB
  } = process.env
  const client = new SQL(`postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOSTNAME}:${POSTGRES_PORT}/${POSTGRES_DB}`);
  return drizzle({
    schema,
    client
  })
}
