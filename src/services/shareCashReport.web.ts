import type { CashReport } from './business';
import { cashReportCsv } from './cashReportCsv';
export async function shareCashReport(report: CashReport) {
  const url = URL.createObjectURL(new Blob([cashReportCsv(report)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'BistroHub-Cash-report.csv'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
