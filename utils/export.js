/**
 * Love Meter ❤️ — Export helpers (CSV, JSON, Excel-compatible XLS).
 *
 * Generates file content strings from calculation rows. All outputs include
 * a UTF-8 BOM where appropriate so Excel opens them correctly.
 */

function escCsv(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function escXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;');
}

const HEADERS = [
  'ID',
  'Your Name',
  'Crush Name',
  'Score',
  'Message',
  'Date',
  'Time',
  'Device',
  'Browser',
  'OS',
  'Language',
  'Timezone',
  'Session'
];

function rowValues(r) {
  const d = r.date instanceof Date ? r.date : new Date(r.timestamp || r.date || r.createdAt);
  const dateStr = d.toISOString ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
  const timeStr = d.toISOString ? d.toISOString().slice(11, 19) : '';
  return [
    r.id ?? '',
    r.yourName ?? r.name1 ?? '',
    r.crushName ?? r.name2 ?? '',
    r.score ?? '',
    r.message ?? r.title ?? '',
    dateStr,
    timeStr,
    r.device ?? '',
    r.browser ?? '',
    r.os ?? '',
    r.language ?? '',
    r.timezone ?? '',
    r.anonymousSessionId ?? r.sessionId ?? ''
  ];
}

export function toCSV(rows) {
  const lines = [
    HEADERS.map(escCsv).join(','),
    ...rows.map((r) => rowValues(r).map(escCsv).join(','))
  ];
  return '\uFEFF' + lines.join('\r\n');
}

export function toJSON(rows) {
  return JSON.stringify(rows, null, 2);
}

export function toXLS(rows) {
  const headerRow = `<Row>${HEADERS.map((h) => `<Cell><Data ss:Type="String">${escXml(h)}</Data></Cell>`).join('')}</Row>`;
  const bodyRows = rows
    .map(
      (r) =>
        `<Row>${rowValues(r)
          .map((cell) => `<Cell><Data ss:Type="String">${escXml(cell)}</Data></Cell>`)
          .join('')}</Row>`
    )
    .join('\n');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="LoveMeter">
  <Table>
   ${headerRow}
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`;
}

export function contentTypeFor(format) {
  switch (format) {
    case 'json':
      return 'application/json';
    case 'xlsx':
    case 'xls':
      return 'application/vnd.ms-excel';
    default:
      return 'text/csv; charset=utf-8';
  }
}

export function extensionFor(format) {
  if (format === 'json') return 'json';
  if (format === 'xlsx' || format === 'xls') return 'xls';
  return 'csv';
}

