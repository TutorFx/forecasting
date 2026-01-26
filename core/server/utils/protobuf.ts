import { zodToProtobuf } from 'zod-to-protobuf'
import protobuf from 'protobufjs'
import { camelCase, snakeCase } from 'scule'
import type { z } from 'zod/v4'

function mapKeys(obj: unknown, mapper: (key: string) => string): unknown {
  if (Array.isArray(obj)) {
    return obj.map(v => mapKeys(v, mapper))
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Uint8Array) && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [mapper(k), mapKeys(v, mapper)])
    )
  }
  return obj
}

export function toBuffer<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  data: z.infer<z.ZodObject<T>>
) {
  const { root } = protobuf.parse(zodToProtobuf(schema as never))
  const SimpleMessage = root.lookupType('Message')

  const camelData = mapKeys(data, camelCase)
  const message = SimpleMessage.fromObject(camelData as Record<string, unknown>)
  const buffer = SimpleMessage.encode(message).finish()

  return Buffer.from(buffer)
}

export function fromBuffer<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  buffer: Uint8Array
): z.infer<z.ZodObject<T>> {
  const { root } = protobuf.parse(zodToProtobuf(schema as never))
  const SimpleMessage = root.lookupType('Message')
  const message = SimpleMessage.decode(buffer)

  const decoded = SimpleMessage.toObject(message, {
    defaults: true,
    longs: String,
    enums: String,
    bytes: String
  })

  // Use scule to convert back to snakeCase for Zod/App
  return mapKeys(decoded, snakeCase) as z.infer<z.ZodObject<T>>
}
