export default defineEventHandler(async () => {
  const connection = await getRabbitMQConnection()
  const channel = await createRabbitMQChannel(connection)

  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  const filePath = path.resolve(process.cwd(), 'mock-data/sku_prophet_treino.csv')
  const fileContent = await fs.readFile(filePath, 'utf-8')

  const csvDataVF = fileContent
    .trim()
    .split('\n')
    .slice(1) // Remove header
    .map((line) => {
      const [ds, _codpro, cnpj, y, _unid, _item_id, _modelo_recomendado, _id_seq, _cnpjd, _id_curto, sku] = line.split(';')
      return { ds: new Date(ds!), y: parseFloat(y!), cnpj: cnpj!, sku: sku! }
    })

  const ids = new Set<string>()

  for (const item of csvDataVF) {
    ids.add(`${item.cnpj}||${item.sku}`.replaceAll('\r', ''))
  }

  for (const id of ids) {
    const [cnpj, sku] = id.split('||')

    const data = csvDataVF.filter(item => item.cnpj === cnpj && item.sku === sku + '\r')
      .map(item => ({ ds: item.ds, y: item.y })).sort((a, b) => a.ds.getTime() - b.ds.getTime())

    const symbol = id
    const periods = 12
    const freq = 'M'
    const holidayCountryCode = 'US'
    const response = univariatedEngine({
      channel,
      input: {
        name: UNIVARIATE_MODELS.PROPHET,
        symbol,
        periods,
        freq,
        holidayCountryCode,
        data: data
      }
    })

    return response
  }
})
