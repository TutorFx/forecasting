import { zodToProtobuf } from 'zod-to-protobuf'
import protobuf from 'protobufjs'
import type { z } from 'zod/v4'

export function toBuffer<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  data: z.infer<z.ZodObject<T>>
) {
  const { root } = protobuf.parse(zodToProtobuf(schema as never))
  const SimpleMessage = root.lookupType('Message')
  return SimpleMessage.encode(data).finish()
}

export function fromBuffer<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  buffer: Uint8Array
): z.infer<z.ZodObject<T>> {
  console.log(zodToProtobuf(schema as never))
  const { root } = protobuf.parse(zodToProtobuf(schema as never))
  const SimpleMessage = root.lookupType('Message')
  const message = SimpleMessage.decode(buffer)
  return SimpleMessage.toObject(message) as z.infer<z.ZodObject<T>>
}
