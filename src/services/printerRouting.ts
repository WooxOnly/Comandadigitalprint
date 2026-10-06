import type { PrinterSettings, PrintableOrder } from '../../printerService';
import { getNetworkPrinterEndpoint } from './networkPrintTransport';
import { validPrinterRouting } from '../../shared/operations-validation.mjs';
export type PrinterDestination = { id: string; name: string; address: string; port: string; paperWidth: PrinterSettings['paperWidth']; categories: string[] };
export type PrinterRouting = { enabled: boolean; destinations: PrinterDestination[]; receiptDestinationId?: string };
const targetSettings = (target: PrinterDestination): PrinterSettings => ({ connection: 'wifi', name: target.name, address: target.address, port: target.port, paperWidth: target.paperWidth });
export function buildPrintPlan(order: PrintableOrder, settings: PrinterSettings) {
  const routing = settings.routing;
  if (routing?.enabled && !validPrinterRouting(routing)) throw new Error('Confira os destinos, categorias e endereços das impressoras.');
  const jobs = new Map<string, { id: string; label: string; order: PrintableOrder; settings: PrinterSettings }>();
  for (const item of order.items) {
    const target = routing?.enabled ? routing.destinations.find(destination => destination.categories.includes((item as { category?: string }).category ?? '')) : undefined;
    const id = target?.id ?? 'default', printer = target ? targetSettings(target) : settings;
    if (!jobs.has(id)) jobs.set(id, { id, label: (target?.name ?? settings.name) || 'Impressora principal', order: { ...order, items: [] }, settings: printer });
    jobs.get(id)!.order.items.push(item);
  }
  const plan = [...jobs.values()];
  for (const job of plan) if (job.settings.connection === 'wifi') getNetworkPrinterEndpoint(job.settings);
  return plan;
}
export function customerReceiptPrinter(settings: PrinterSettings) {
  const routing = settings.routing;
  if (!routing?.enabled || !routing.receiptDestinationId) return settings;
  if (!validPrinterRouting(routing)) throw new Error('Confira os destinos, categorias e endereços das impressoras.');
  const target = routing.destinations.find(destination => destination.id === routing.receiptDestinationId);
  return target ? targetSettings(target) : settings;
}
// Mark only confirmed destinations. A failed destination is never retried automatically.
export async function dispatchPrintPlan(plan: ReturnType<typeof buildPrintPlan>, completed: Set<string>, send: (job: ReturnType<typeof buildPrintPlan>[number]) => Promise<void>, onSent: (id: string) => void) {
  for (const job of plan) { if (completed.has(job.id)) continue; await send(job); completed.add(job.id); onSent(job.id); }
}
