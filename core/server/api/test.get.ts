export default defineEventHandler(async () => {
  const connection = await getRabbitMQConnection()
  const channel = await createRabbitMQChannel(connection)

  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  const filePath = path.resolve(process.cwd(), 'server/api/AMZN.csv')
  const fileContent = await fs.readFile(filePath, 'utf-8')

  const csvData = fileContent
    .trim()
    .split('\n')
    .slice(1) // Remove header
    .map((line) => {
      const [ds, y] = line.split(';')
      return { ds: new Date(ds!), y: parseFloat(y!) }
    })

  console.log(csvData)

  const symbol = 'AMZN'
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
      data: csvData
    }
  })

  return response
})
