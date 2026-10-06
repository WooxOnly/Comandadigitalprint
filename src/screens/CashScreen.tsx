import { useAccess } from '../ui/useAccess';
import { useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useAuth } from '../state/AuthContext';
import { useBusiness } from '../state/BusinessContext';
import { useApp } from '../state/AppContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { CustomerPicker } from '../ui/CustomerPicker';
import { CashRefundPanel } from '../ui/CashRefundPanel';
import { normalizePayments } from '../../shared/cash-payments.mjs';
import { BusinessItemsEditor } from '../ui/BusinessItemsEditor';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from '../ui/KeyboardControls';
import { styles } from '../ui/theme';
import { formatMoney, parseMoney, type BusinessItem, type PaymentMethod, type CustomerReceipt, type Discount, type CashEntry, type Payment } from '../services/business';
import { calculateSale } from '../../shared/cash-pricing.mjs';
import { printCustomerReceipt } from '../../printerService';
import { customerReceiptPrinter } from '../services/printerRouting';
import { printFailureMessage } from '../services/printJob';
import { cloud } from '../services/cloudStorage';
import { logError } from '../services/diagnostics';

export default function CashScreen() {
  const { modules, overview, pendingCash, busy: working, cashCommand } = useBusiness();
  const canReprint = useAccess('reprint');
  const [printedReceipts, setPrintedReceipts] = useState(new Set<string>());
  const busy = working || !!pendingCash;
  const { printerSettings, showFeedback } = useApp();
  const { currentUser } = useAuth();
  const { t, locale, language } = useLanguage();
  const [opening, setOpening] = useState('0.00'), [counted, setCounted] = useState('');
  const [amount, setAmount] = useState(''), [note, setNote] = useState(''), [customer, setCustomer] = useState('');
  const [items, setItems] = useState<BusinessItem[]>([]), [method, setMethod] = useState<PaymentMethod>('cash'), [tendered, setTendered] = useState('');
  const [error, setError] = useState(''), [receipt, setReceipt] = useState<CustomerReceipt | null>(null);
  const [printing, setPrinting] = useState(false);
  const [discountKind, setDiscountKind] = useState<Discount['kind']>('amount');
  const [discountText, setDiscountText] = useState('0.00'), [discountReason, setDiscountReason] = useState('');
  const [reversing, setReversing] = useState<{ entry: CashEntry; kind: 'void' | 'refund' } | null>(null);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [tip, setTip] = useState('0.00'), [deliveryFee, setDeliveryFee] = useState('0.00');
  const [split, setSplit] = useState(false), [parts, setParts] = useState<Record<PaymentMethod, string>>({ cash: '0.00', card: '0.00', zelle: '0.00' });
  const operation = useRef<{ signature: string; id: string } | null>(null);
  const session = overview?.sessions.find(record => !record.closedAt);
  const money = (cents: number) => formatMoney(cents, locale);
  const canManage = currentUser === 'admin' || !!overview?.settings?.managers.includes(currentUser);
  const taxRateBps = overview?.settings?.tax.enabled ? overview.settings.tax.rateBps : 0;
  const extras = () => ({ tipCents: parseMoney(tip), deliveryFeeCents: parseMoney(deliveryFee) });
  function paymentsInput(totalCents: number) {
    return normalizePayments(split ? (['cash', 'card', 'zelle'] as const).map(value => ({ method: value, amountCents: parseMoney(parts[value]), ...(value === 'cash' ? { tenderedCents: parseMoney(tendered || parts.cash) } : {}) })).filter(row => row.amountCents > 0) : [{ method, amountCents: totalCents, tenderedCents: method === 'cash' ? parseMoney(tendered) : totalCents }], totalCents);
  }
  let allocated: number | null = null; try { allocated = Object.values(parts).reduce((sum, part) => sum + parseMoney(part), 0); } catch { /* Incomplete draft. */ }
  function discountInput(): Discount { return { kind: discountKind, value: canManage ? parseMoney(discountText) : 0, reason: canManage ? discountReason.trim() : '' }; }
  let total: number | null = null;
  let pricing: ReturnType<typeof calculateSale> | undefined;
  try { pricing = calculateSale(items, discountInput(), taxRateBps, extras()); total = pricing.totalCents; } catch { /* Incomplete draft. */ }
  if (!modules.cash) return <ScreenFrame><Text style={styles.settingsIntro}>{t('Módulo não habilitado para esta empresa.')}</Text></ScreenFrame>;
  async function execute(input: Record<string, unknown>) {
    const signature = JSON.stringify(input);
    if (operation.current?.signature !== signature) operation.current = { signature, id: randomUUID() };
    const result = await cashCommand({ ...input, id: operation.current.id });
    operation.current = null; setError(''); return result;
  }
  async function sale() {
    try {
      const discount = discountInput(), totalCents = calculateSale(items, discount, taxRateBps, extras()).totalCents;
      const result = await execute({ operation: 'sale', sessionId: session!.id, items, payments: paymentsInput(totalCents), ...extras(), customer: customer.trim(), ...(modules.customers && customerId ? { customerId } : {}), note: '', discount, taxRateBps });
      setReceipt(result.receipt || null); setItems([]); setTendered(''); setCustomer(''); setDiscountText('0.00'); setDiscountReason(''); setCustomerId(undefined); setTip('0.00'); setDeliveryFee('0.00'); setParts({ cash: '0.00', card: '0.00', zelle: '0.00' });
    } catch (e) { setError((e as Error).message); }
  }
  async function print(receipt: CustomerReceipt, isNew = false) {
    if (printing) return;
    setPrinting(true);
    try {
      const priorPrint = (await cloud.list('activity:')).some(value => { const activity = value as { kind: string; target: string }; return ['print', 'reprint'].includes(activity.kind) && activity.target === receipt.id; });
      const reprint = !isNew || printedReceipts.has(receipt.id) || priorPrint;
      if (reprint && !cloud.allowed('reprint', currentUser)) throw new Error('Usuário sem permissão para esta ação.');
      await cloud.activity(reprint ? 'reprint' : 'print', receipt.id, 'Recibo do cliente');
      setPrintedReceipts(previous => new Set([...previous, receipt.id]));
      const currentReceipt = overview?.entries.find(entry => entry.id === receipt.id)?.receipt ?? receipt;
      await printCustomerReceipt(currentReceipt, printerSettings, language);
      const destination = customerReceiptPrinter(printerSettings);
      showFeedback(destination.connection === 'wifi' ? 'Impressão enviada' : 'Impressão aberta', destination.connection === 'wifi' ? 'Recibo enviado à impressora pela rede. Confira a saída do papel.' : 'Confirme o envio na janela de impressão.', 'success');
    }
    catch (e) { logError('cash.print_failed', e); Alert.alert(t('Impressão indisponível'), t(printFailureMessage(e))); }
    finally { setPrinting(false); }
  }
  return <ScreenFrame><View style={{ gap: 12 }}>
    <Text style={styles.settingsIntro}>{t('Caixa em USD: dinheiro, cartão e Zelle. Cada tablet tem sua própria abertura e fechamento.')}</Text>
    <Text style={styles.helperText}>{t('Movimentações do caixa exigem conexão. As comandas e encomendas continuam disponíveis sem depender do caixa.')}</Text>
    <Pressable accessibilityRole="button" disabled={busy} style={styles.secondaryWideButton} onPress={() => void cloud.sync()}><Text style={styles.secondaryButtonText}>{t('Atualizar caixa')}</Text></Pressable>
    {canManage && <Pressable accessibilityRole="button" style={styles.secondaryWideButton} onPress={() => router.navigate('/cash-reports')}><Text style={styles.secondaryButtonText}>{t('Relatórios do Caixa')}</Text></Pressable>}
    {!!error && <Text style={styles.errorText} accessibilityLiveRegion="polite">{t(error)}</Text>}
    {pendingCash && <View style={styles.panel}><Text style={styles.helperText}>{t('Há uma operação sem confirmação. Consulte seu resultado antes de movimentar o caixa novamente.')}</Text><Pressable accessibilityRole="button" disabled={working} style={styles.secondaryWideButton} onPress={() => { void cashCommand(pendingCash).then(result => { operation.current = null; setError(''); if (result.receipt) { setReceipt(result.receipt); setItems([]); setTendered(''); setCustomer(''); setDiscountText('0.00'); setDiscountReason(''); setCustomerId(undefined); setTip('0.00'); setDeliveryFee('0.00'); setParts({ cash: '0.00', card: '0.00', zelle: '0.00' }); } if (['void', 'refund'].includes(String(pendingCash.operation))) { setReversing(null);  setReceipt(null); } }).catch(e => setError(e.message)); }}><Text style={styles.secondaryButtonText}>{t('Consultar operação pendente')}</Text></Pressable></View>}
    {receipt && <View style={styles.panel}><Text style={styles.panelTitle}>{t('Recebimento registrado')} · {money(receipt.totalCents)}</Text>{receipt.changeCents > 0 && <Text style={styles.cardTitle}>{t('Troco')}: {money(receipt.changeCents)}</Text>}<Pressable accessibilityRole="button" disabled={printing || (!canReprint && printedReceipts.has(receipt.id))} style={styles.secondaryWideButton} onPress={() => void print(receipt, true)}><Text style={styles.secondaryButtonText}>{t('Imprimir recibo não fiscal')}</Text></Pressable></View>}
    {!session ? <View style={styles.panel}>
      <Text style={styles.panelTitle}>{t('Abertura de caixa')}</Text><Text style={styles.fieldLabel}>{t('Dinheiro inicial (USD)')}</Text>
      <TextInput editable={!busy} value={opening} onChangeText={setOpening} keyboardType="decimal-pad" style={styles.input} maxLength={11} accessibilityLabel={t('Dinheiro inicial (USD)')} />
      <Pressable accessibilityRole="button" disabled={busy || !overview} style={styles.sendButton} onPress={() => { try { void execute({ operation: 'open', openingCents: parseMoney(opening) }).catch(e => setError(e.message)); } catch (e) { setError((e as Error).message); } }}><Text style={styles.sendButtonText}>{t('Abrir caixa')}</Text></Pressable>
    </View> : <>
      <View style={styles.panel}><Text style={styles.panelTitle}>{t('Caixa aberto')}</Text><Text style={styles.mutedText}>{new Date(session.openedAt).toLocaleString(locale)} · {session.openedBy}</Text>
        <Text style={styles.cardTitle}>{t('Saldo esperado em dinheiro')}: {money(session.summary.expectedCents)}</Text>
        <Text style={styles.mutedText}>{t('Dinheiro')}: {money(session.summary.cashCents)} · {t('Cartão')}: {money(session.summary.cardCents)} · Zelle: {money(session.summary.zelleCents)}</Text>
      </View>
      <View style={styles.panel}><Text style={styles.panelTitle}>{t('Registrar recebimento')}</Text>
        <CustomerPicker disabled={busy} selectedId={customerId} onSelect={record => { setCustomerId(record?.id); if (record) setCustomer(record.name); }} />
        <Text style={styles.fieldLabel}>{t('Cliente (opcional)')}</Text><TextInput editable={!busy} value={customer} onChangeText={value => { setCustomer(value); setCustomerId(undefined); }} maxLength={500} style={styles.input} accessibilityLabel={t('Cliente (opcional)')} />
        <BusinessItemsEditor items={items} onChange={setItems} priced disabled={busy} priceEditable={canManage} />
        {!canManage && <Text style={styles.helperText}>{t('Preços e descontos são autorizados por gerentes ou administradores.')}</Text>}
        {canManage && <View style={{ gap: 8 }}><Text style={styles.sectionTitle}>{t('Desconto autorizado')}</Text>
          <View style={styles.quickNotes}>{(['amount', 'percent'] as const).map(kind => <Pressable accessibilityRole="button" key={kind} disabled={busy} style={[styles.noteChip, discountKind === kind && styles.selectedCategory]} onPress={() => { setDiscountKind(kind); setDiscountText('0.00'); }}><Text style={[styles.noteChipText, discountKind === kind && styles.selectedCategoryText]}>{t(kind === 'amount' ? 'Valor (USD)' : 'Percentual (%)')}</Text></Pressable>)}</View>
          <TextInput value={discountText} editable={!busy} onChangeText={setDiscountText} keyboardType="decimal-pad" maxLength={11} style={styles.input} accessibilityLabel={t('Desconto')} />
          <Text style={styles.fieldLabel}>{t('Motivo do desconto')}</Text><TextInput value={discountReason} editable={!busy} onChangeText={setDiscountReason} maxLength={1000} style={styles.input} accessibilityLabel={t('Motivo do desconto')} />
        </View>}
        <Text style={styles.fieldLabel}>{t('Gorjeta voluntária (USD)')}</Text><TextInput editable={!busy} value={tip} onChangeText={setTip} keyboardType="decimal-pad" style={styles.input} maxLength={11} accessibilityLabel={t('Gorjeta voluntária (USD)')} />
        <Text style={styles.fieldLabel}>{t('Taxa de entrega (USD)')}</Text><TextInput editable={!busy} value={deliveryFee} onChangeText={setDeliveryFee} keyboardType="decimal-pad" style={styles.input} maxLength={11} accessibilityLabel={t('Taxa de entrega (USD)')} />
        <Text style={styles.helperText}>{t('Gorjeta não entra no sales tax. A taxa de entrega usa a taxa configurada da empresa.')}</Text>
        {pricing && <><Text style={styles.cardTitle}>{t('Subtotal')}: {money(pricing.subtotalCents)}</Text><Text style={styles.mutedText}>{t('Desconto')}: {money(pricing.discountCents)} · Sales tax ({taxRateBps / 100}%): {money(pricing.taxCents)}</Text></>}
        <Text style={styles.mutedText}>{t('Gorjeta')}: {money(pricing?.tipCents ?? 0)} · {t('Taxa de entrega')}: {money(pricing?.deliveryFeeCents ?? 0)}</Text>
        <Text style={styles.sectionTitle}>{t('Total')}: {total === null ? '—' : money(total)}</Text>
        <Pressable disabled={busy} style={styles.noteChip} onPress={() => setSplit(!split)}><Text style={styles.noteChipText}>{t(split ? 'Usar uma forma de pagamento' : 'Dividir pagamento')}</Text></Pressable>
        {split ? <>{(['cash', 'card', 'zelle'] as const).map(value => <View key={value}><Text style={styles.fieldLabel}>{t(value === 'cash' ? 'Dinheiro' : value === 'card' ? 'Cartão' : 'Zelle')} (USD)</Text><TextInput editable={!busy} value={parts[value]} onChangeText={text => setParts({ ...parts, [value]: text })} keyboardType="decimal-pad" maxLength={11} style={styles.input} accessibilityLabel={value + ' USD'} /></View>)}
          {total !== null && allocated !== null && <Text style={allocated > total ? styles.errorText : styles.cardTitle}>{t(allocated > total ? 'Valor acima do total' : 'Falta receber')}: {money(Math.abs(total - allocated))}</Text>}
        </> : <View style={styles.quickNotes}>{(['cash', 'card', 'zelle'] as const).map(value => <Pressable accessibilityRole="button" key={value} disabled={busy} style={[styles.noteChip, method === value && styles.selectedCategory]} onPress={() => setMethod(value)}><Text style={[styles.noteChipText, method === value && styles.selectedCategoryText]}>{t(value === 'cash' ? 'Dinheiro' : value === 'card' ? 'Cartão' : 'Zelle')}</Text></Pressable>)}</View>}
        {(split || method === 'cash') && <><Text style={styles.fieldLabel}>{t('Recebido em dinheiro (USD)')}</Text><TextInput editable={!busy} value={tendered} onChangeText={setTendered} placeholder={split ? parts.cash : ''} keyboardType="decimal-pad" style={styles.input} maxLength={11} accessibilityLabel={t('Recebido em dinheiro (USD)')} /></>}
        {(() => { try { const cash = total === null ? null : paymentsInput(total).find((payment: Payment) => payment.method === 'cash'); return cash && <Text style={styles.cardTitle}>{t('Troco')}: {money(cash.changeCents ?? 0)}</Text>; } catch { return null; } })()}
        <Text style={styles.helperText}>{t('Confirme o pagamento no terminal do cartão ou no Zelle antes de registrar. Este aplicativo registra o recebimento.')}</Text>
        <Pressable accessibilityRole="button" disabled={busy || total === null || (split && allocated !== total)} style={styles.sendButton} onPress={() => void sale()}><Text style={styles.sendButtonText}>{t('Registrar recebimento')}</Text></Pressable>
      </View>
      <View style={styles.panel}><Text style={styles.panelTitle}>{t('Entradas e saídas')}</Text>
        <Text style={styles.fieldLabel}>{t('Valor (USD)')}</Text><TextInput value={amount} onChangeText={setAmount} editable={!busy} keyboardType="decimal-pad" style={styles.input} maxLength={11} accessibilityLabel={t('Valor (USD)')} />
        <Text style={styles.fieldLabel}>{t('Motivo')}</Text><TextInput value={note} onChangeText={setNote} editable={!busy} maxLength={1000} style={styles.input} accessibilityLabel={t('Motivo')} />
        <View style={styles.quickNotes}>{(['in', 'out'] as const).map(kind => <Pressable accessibilityRole="button" disabled={busy} key={kind} style={styles.noteChip} onPress={() => { try { const amountCents = parseMoney(amount); void execute({ operation: kind, sessionId: session.id, amountCents, note: note.trim() }).then(() => { setAmount(''); setNote(''); }).catch(e => setError(e.message)); } catch (e) { setError((e as Error).message); } }}><Text style={styles.noteChipText}>{t(kind === 'in' ? 'Entrada de dinheiro' : 'Saída de dinheiro')}</Text></Pressable>)}</View>
      </View>
      <View style={styles.panel}><Text style={styles.panelTitle}>{t('Fechamento de caixa')}</Text><Text style={styles.fieldLabel}>{t('Dinheiro contado (USD)')}</Text><TextInput value={counted} onChangeText={setCounted} editable={!busy} keyboardType="decimal-pad" maxLength={11} style={styles.input} accessibilityLabel={t('Dinheiro contado (USD)')} />
        <Pressable accessibilityRole="button" disabled={busy} style={styles.secondaryWideButton} onPress={() => { try { const countedCents = parseMoney(counted); Alert.alert(t('Fechar caixa'), `${t('Dinheiro contado (USD)')}: ${money(countedCents)}`, [{ text: t('Cancelar') }, { text: t('Confirmar'), onPress: () => { void execute({ operation: 'close', sessionId: session.id, countedCents }).then(() => setCounted('')).catch(e => setError(e.message)); } }]); } catch (e) { setError((e as Error).message); } }}><Text style={styles.secondaryButtonText}>{t('Fechar caixa')}</Text></Pressable>
      </View>
    </>}
    <Text style={styles.sectionTitle}>{t('Fechamentos recentes')}</Text>
    {overview?.sessions.filter(record => !!record.closedAt).map(record => <View key={record.id} style={styles.historyCard}><Text style={styles.cardTitle}>{new Date(record.closedAt!).toLocaleString(locale)}</Text><Text style={styles.mutedText}>{t('Esperado')}: {money(record.summary.expectedCents)} · {t('Contado')}: {money(record.countedCents!)} · {t('Diferença')}: {money(record.countedCents! - record.summary.expectedCents)}</Text></View>)}
    <Text style={styles.sectionTitle}>{t('Movimentações recentes')}</Text>
    {reversing && session && <CashRefundPanel key={reversing.entry.id + reversing.kind} entry={overview?.entries.find(entry => entry.id === reversing.entry.id) ?? reversing.entry} kind={reversing.kind} busy={busy} onClose={() => setReversing(null)} onConfirm={async (reason, refund) => { await execute({ operation: reversing.kind, saleId: reversing.entry.id, sessionId: session.id, reason, refund }); setReversing(null); setReceipt(null); }} />}
    {overview?.entries.map(entry => <View key={entry.id} style={styles.historyCard}>
      <Text style={styles.cardTitle}>{t(entry.kind === 'sale' ? 'Recebimento' : entry.kind === 'in' ? 'Entrada de dinheiro' : 'Saída de dinheiro')} · {money(entry.amountCents)}</Text>
      <Text style={styles.mutedText}>{new Date(entry.createdAt).toLocaleString(locale)} · {entry.actor} · {t(entry.method === 'cash' ? 'Dinheiro' : entry.method === 'card' ? 'Cartão' : entry.method === 'split' ? 'Pagamento dividido' : 'Zelle')}{entry.note ? ` · ${entry.note}` : ''}</Text>
      {!!entry.receipt?.discountCents && <Text style={styles.mutedText}>{t('Desconto')}: {money(entry.receipt.discountCents)} · {entry.receipt.discountReason} · {entry.receipt.authorizedBy}</Text>}
      {!!entry.receipt?.priceAdjustments?.length && <Text style={styles.mutedText}>{t('Preço ajustado por')}: {entry.receipt.authorizedBy}</Text>}
      {entry.reversal && <Text style={styles.errorText}>{t(entry.reversal.kind === 'void' ? 'Venda cancelada' : entry.reversal.partial ? 'Estorno parcial' : 'Venda estornada')} · {money(entry.reversal.amountCents)} · {entry.reversal.actor} · {entry.reversal.reason}</Text>}
      {entry.receipt && <Pressable accessibilityRole="button" disabled={printing || !canReprint} style={styles.addButton} onPress={() => void print(entry.receipt!)}><Text style={styles.addButtonText}>{t('Imprimir recibo não fiscal')}</Text></Pressable>}
      {canManage && session && entry.kind === 'sale' && (!entry.reversal || (entry.reversal.remainingCents ?? 0) > 0) && <View style={styles.quickNotes}>{(['void', 'refund'] as const).filter(kind => kind === 'refund' || (!entry.reversal && entry.sessionId === session.id)).map(kind => <Pressable accessibilityRole="button" key={kind} disabled={busy} style={styles.noteChip} onPress={() => { setReversing({ entry, kind });  }}><Text style={styles.noteChipText}>{t(kind === 'void' ? 'Cancelar venda' : 'Estornar venda')}</Text></Pressable>)}</View>}
    </View>)}
    {(overview?.adjustments ?? []).map(adjustment => <View key={adjustment.id} style={styles.historyCard}><Text style={styles.cardTitle}>{t(adjustment.kind === 'void' ? 'Cancelamento' : 'Estorno')} · −{money(adjustment.amountCents)}</Text><Text style={styles.mutedText}>{new Date(adjustment.createdAt).toLocaleString(locale)} · {adjustment.actor} · {adjustment.reason}</Text></View>)}
  </View></ScreenFrame>;
}
