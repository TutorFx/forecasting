import type { MultiModelRequest, ProphetRequest } from '#project-schemas'

export function adaptMultiModel(multiModelRequest: MultiModelRequest) {
  function toProphet(): ProphetRequest {
    const prophetRequest: ProphetRequest = {
      job_id: multiModelRequest.job_id,
      parameters: {
        periods: multiModelRequest.forecast_parameters.periods,
        freq: multiModelRequest.forecast_parameters.freq,
        holiday_country_code: multiModelRequest.forecast_parameters.holiday_country_code
      },
      columns: multiModelRequest.time_series_data.columns,
      data: multiModelRequest.time_series_data.data
    }

    return prophetRequest
  }

  function toSarima() {
    throw new Error('Not implemented')
  }

  return { toProphet, toSarima }
}
