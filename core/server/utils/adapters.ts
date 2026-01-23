import type { MultiModelRequest, ProphetRequest } from '#project-schemas'

export function adaptMultiModel(multiModelRequest: MultiModelRequest) {
  function toProphet(): ProphetRequest {
    return multiModelRequest
  }

  function toSarima() {
    throw new Error('Not implemented')
  }

  return { toProphet, toSarima }
}
