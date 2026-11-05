export function parseCsv(csvText) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index]

    if (inQuotes) {
      if (character === '"' && csvText[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        inQuotes = false
      } else {
        field += character
      }
    } else if (character === '"' && field.length === 0) {
      inQuotes = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n' || character === '\r') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      if (character === '\r' && csvText[index + 1] === '\n') index += 1
    } else {
      field += character
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  const headers = rows.shift()?.map((header, index) =>
    index === 0 ? header.replace(/^\uFEFF/, '') : header,
  ) ?? []

  return rows
    .filter((values) => values.some((value) => value.length > 0))
    .map((values) => Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? '']),
    ))
}
