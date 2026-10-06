import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { randomUUID } from 'expo-crypto';
import type { CashReport } from './business';
import { cashReportCsv } from './cashReportCsv';

export async function shareCashReport(report: CashReport) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Compartilhamento de arquivos indisponível neste aparelho.');
  const directory = new Directory(Paths.cache, 'bistro-cash-reports'); directory.create({ idempotent: true });
  const file = new File(directory, `cash-report-${randomUUID()}.csv`);
  try {
    file.create(); file.write(cashReportCsv(report));
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'BistroHub - Cash report' });
  } catch (error) { if (file.exists) file.delete(); throw error; }
}
