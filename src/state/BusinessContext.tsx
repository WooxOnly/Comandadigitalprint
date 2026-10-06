import { createContext, useContext, useEffect, useRef, useState, type ReactNode, useSyncExternalStore } from 'react';
import { randomUUID } from 'expo-crypto';
import { cloud } from '../services/cloudStorage';
import { useStoreModules } from '../ui/useStoreModules';
import type { Preorder, Customer, Delivery, Preparation } from '../services/business';
import { useApp } from './AppContext';
import { isProductAvailable } from '../services/catalogOptions';
import { logError } from '../services/diagnostics';

function useBusinessState() {
  const { productOptions } = useApp();
  const modules = useStoreModules();
  const overview = useSyncExternalStore(cloud.subscribe, cloud.cashOverview);
  const pendingCash = useSyncExternalStore(cloud.subscribe, cloud.pendingCashCommand);
  const [preparation, setPreparation] = useState<Preparation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [preorders, setPreorders] = useState<Preorder[]>([]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let mounted = true;
    const load = () => { void cloud.list('preorder:').then(values => { if (mounted) setPreorders((values as Preorder[]).sort((a, b) => a.dueAt.localeCompare(b.dueAt))); }).catch(error => logError('preorder.load_failed', error)); };
    const loadCustomers = () => { void cloud.list('customer:').then(values => { if (mounted) setCustomers((values as Customer[]).sort((a, b) => a.name.localeCompare(b.name))); }).catch(error => logError('customer.load_failed', error)); };
    const loadPreparation = () => { void cloud.list('preparation:').then(values => { if (mounted) setPreparation(values as Preparation[]); }).catch(error => logError('preparation.load_failed', error)); };
    loadPreparation();
    loadCustomers();
    load(); const unsubscribe = cloud.subscribe(() => { load(); loadCustomers(); loadPreparation(); });
    return () => { mounted = false; unsubscribe(); };
  }, []);
  async function run<T,>(operation: () => Promise<T>) {
    if (lock.current) throw new Error('Aguarde a operação em andamento.');
    lock.current = true; setBusy(true);
    try { return await operation(); } finally { lock.current = false; setBusy(false); }
  }
  async function savePreorder(input: Omit<Preorder, 'id' | 'createdAt' | 'status'>) {
    return run(async () => {
      if (!modules.preorders) throw new Error('Módulo não habilitado para esta empresa.');
      if (input.items.some(item => item.productId && !isProductAvailable(item.productId, productOptions))) throw new Error('Produto esgotado. Escolha outro produto.');
      const record: Preorder = { ...input, id: randomUUID(), createdAt: new Date().toISOString(), status: 'scheduled' };
      await cloud.write({ ['preorder:' + record.id]: record });
      return record;
    });
  }
  async function setPreorderStatus(id: string, status: Preorder['status']) {
    return run(async () => {
      if (!modules.preorders) throw new Error('Módulo não habilitado para esta empresa.');
      const record = await cloud.get('preorder:' + id) as Preorder | undefined;
      if (!record) throw new Error('Encomenda não encontrada.');
      if (status === 'completed' && record.delivery && record.delivery.status !== 'delivered') throw new Error('Marque a entrega como entregue antes de concluir a encomenda.');
      await cloud.write({ ['preorder:' + id]: { ...record, status } });
    });
  }
  async function saveCustomer(input: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>, id?: string) {
    return run(async () => {
      if (!modules.customers) throw new Error('Módulo não habilitado para esta empresa.');
      const previous = id ? await cloud.get('customer:' + id) as Customer | undefined : undefined;
      if (id && !previous) throw new Error('Cliente não encontrado.');
      const now = new Date().toISOString();
      const record: Customer = { ...input, id: previous?.id ?? randomUUID(), createdAt: previous?.createdAt ?? now, updatedAt: now };
      await cloud.write({ ['customer:' + record.id]: record }); return record;
    });
  }
  async function updateDelivery(id: string, delivery: Delivery) {
    return run(async () => {
      if (!modules.preorders) throw new Error('Módulo não habilitado para esta empresa.');
      const record = await cloud.get('preorder:' + id) as Preorder | undefined;
      if (!record || record.fulfillment !== 'delivery' || ['completed', 'cancelled'].includes(record.status)) throw new Error('Encomenda indisponível para alterar entrega.');
      if (record.delivery?.status === 'delivered') throw new Error('Entrega já concluída.');
      if (delivery.status !== 'pending' && !delivery.driver.trim()) throw new Error('Informe o responsável pela entrega.');
      const now = new Date().toISOString();
      await cloud.write({ ['preorder:' + id]: { ...record, delivery: { ...delivery,
        ...(delivery.status !== 'pending' ? { dispatchedAt: record.delivery?.dispatchedAt ?? now } : {}),
        ...(delivery.status === 'delivered' ? { deliveredAt: now } : {}) } } });
    });
  }
  async function advancePreparation(orderId: string, status: Preparation['status']) { return run(async () => { if (!modules.preparation) throw new Error('Módulo não habilitado para esta empresa.'); const id = randomUUID(); await cloud.write({ ['preparation:' + orderId]: { orderId, status, updatedAt: new Date().toISOString() }, ['activity:' + id]: { id, kind: 'preparation', target: orderId, details: status, createdAt: new Date().toISOString() } }); }); }
  async function cashCommand(input: Record<string, unknown>) {
    return run(async () => {
      try { return await cloud.cashCommand(input); }
      catch (error) {
        logError('cash.operation_failed', error);
        const messages: Record<string, string> = {
          MODULE_DISABLED: 'Módulo não habilitado para esta empresa.', CASH_CLOSED: 'Abra o caixa antes de registrar movimentações.',
          CASH_ALREADY_OPEN: 'Este tablet já tem um caixa aberto.', INSUFFICIENT_CASH: 'O saldo em dinheiro é insuficiente para esta saída.',
          INSUFFICIENT_PAYMENT: 'O valor recebido é menor que o total.', INVALID_RETRY: 'A operação já foi registrada com outros dados.',
          ORDER_ALREADY_PAID: 'Este pedido já foi recebido no caixa.', ORDER_NOT_SYNCED: 'Sincronize o pedido antes de receber no caixa.',
          INVALID_DATA: 'Confira os valores e os itens da operação.',
          CASH_PENDING: 'Consulte a operação pendente antes de iniciar outra movimentação.',
          MANAGER_REQUIRED: 'Somente gerentes e administradores podem autorizar esta operação.',
          PRICE_APPROVAL_REQUIRED: 'O preço ou produto mudou. Atualize os itens ou peça autorização de um gerente.',
          INVALID_DISCOUNT: 'O desconto deve ser menor que o subtotal.',
          PRODUCT_UNAVAILABLE: 'Produto esgotado. Escolha outro produto.',
          INVALID_PAYMENT: 'Confira as formas e valores de pagamento.', PAYMENT_TOTAL_MISMATCH: 'A soma dos pagamentos deve ser igual ao total.',
          INVALID_CUSTOMER: 'Selecione um cliente ativo desta empresa.', INVALID_REFUND: 'Confira os itens ou o valor a devolver.',
          REFUND_CHANGED: 'Outra devolução foi registrada. Atualize o caixa e confira o saldo restante.',
          VOID_AFTER_REFUND: 'Esta venda tem estorno parcial. Devolva o saldo restante pelo estorno.',
          TAX_CHANGED: 'A taxa mudou. Atualize o caixa e confira o total antes de receber.',
          SALE_ALREADY_REVERSED: 'Esta venda já foi cancelada ou estornada.',
          SALE_NOT_FOUND: 'Venda não encontrada nesta empresa.',
          VOID_REQUIRES_ORIGINAL_OPEN: 'Para cancelar, use o caixa original aberto. Após o fechamento, registre um estorno.',
        };
        throw new Error(messages[(error as { code?: string }).code || ''] || 'Conecte à internet e entre na nuvem para movimentar o caixa.');
      }
    });
  }
  return { modules, preparation, advancePreparation, preorders, customers, saveCustomer, updateDelivery, overview, pendingCash, busy, savePreorder, setPreorderStatus, cashCommand };
}
const BusinessContext = createContext<ReturnType<typeof useBusinessState> | null>(null);
export function BusinessProvider({ children }: { children: ReactNode }) {
  const state = useBusinessState();
  return <BusinessContext.Provider value={state}>{children}</BusinessContext.Provider>;
}
export function useBusiness() {
  const value = useContext(BusinessContext);
  if (!value) throw new Error('BusinessProvider missing');
  return value;
}
