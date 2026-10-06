import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from './KeyboardControls';
import { styles } from './theme';
import { useLanguage } from '../i18n/LanguageContext';
import { formatMoney, parseMoney, type CashEntry, type RefundInput, type Payment } from '../services/business';
import { prepareRefund, remainingRefund } from '../../shared/cash-refunds.mjs';
export function CashRefundPanel({ entry, kind, busy, onConfirm, onClose }: { entry: CashEntry; kind: 'void' | 'refund'; busy: boolean; onConfirm: (reason: string, refund: RefundInput) => Promise<void>; onClose: () => void }) {
  const { t, locale } = useLanguage();
  const [mode, setMode] = useState<RefundInput['mode']>('full'), [amount, setAmount] = useState(''), [reason, setReason] = useState('');
  const [quantities, setQuantities] = useState<Record<number, string>>({}), [refundTip, setRefundTip] = useState(false), [refundFee, setRefundFee] = useState(false), [error, setError] = useState('');
  const receipt = entry.receipt!, history = entry.refundHistory ?? [], remaining = remainingRefund(receipt, history);
  const money = (cents: number) => formatMoney(cents, locale);
  function input(): RefundInput {
    if (kind === 'void' || mode === 'full') return { mode: 'full' };
    if (mode === 'amount') return { mode, amountCents: parseMoney(amount) };
    const items = Object.entries(quantities).filter(([, value]) => value && value !== '0').map(([index, value]) => {
      if (!/^\d{1,4}$/.test(value)) throw new Error('Confira as quantidades a devolver.');
      return { index: Number(index), quantity: Number(value) };
    });
    return { mode, items, refundTip, refundDeliveryFee: refundFee };
  }
  let preview: ReturnType<typeof prepareRefund> | null = null;
  try { preview = prepareRefund(receipt, history, input()); } catch { /* Incomplete draft. */ }
  return <View style={styles.panel}><Text style={styles.panelTitle}>{t(kind === 'void' ? 'Cancelar venda' : 'Estornar venda')} · {t('Saldo disponível')}: {money(remaining.amountCents)}</Text>
    <Text style={styles.helperText}>{t('Confirme a devolução no dinheiro, cartão ou Zelle antes de registrar. As formas de pagamento seguem proporcionalmente o saldo da venda.')}</Text>
    {kind === 'refund' && <View style={styles.quickNotes}>{(['full', 'amount', 'items'] as const).map(value => <Pressable disabled={busy} key={value} style={[styles.noteChip, mode === value && styles.selectedCategory]} onPress={() => setMode(value)}><Text style={[styles.noteChipText, mode === value && styles.selectedCategoryText]}>{t(value === 'full' ? 'Saldo integral' : value === 'amount' ? 'Parte do valor' : 'Selecionar itens')}</Text></Pressable>)}</View>}
    {kind === 'refund' && mode === 'amount' && <><Text style={styles.fieldLabel}>{t('Valor a devolver (USD)')}</Text><TextInput editable={!busy} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={styles.input} maxLength={11} accessibilityLabel={t('Valor a devolver (USD)')} /><Text style={styles.helperText}>{t('Estorno por valor distribui a devolução entre produtos, imposto, gorjeta e entrega, sem registrar quantidade devolvida.')}</Text></>}
    {kind === 'refund' && mode === 'items' && <>
      {receipt.items.map((item, index) => <View key={index}><Text style={styles.fieldLabel}>{item.name} · {t('Quantidade disponível')}: {remaining.lines[index].quantity}</Text><TextInput editable={!busy && remaining.lines[index].quantity > 0} value={quantities[index] ?? '0'} onChangeText={value => setQuantities({ ...quantities, [index]: value })} keyboardType="number-pad" maxLength={4} style={styles.input} accessibilityLabel={`${t('Quantidade a devolver')}: ${item.name}`} /></View>)}
      {remaining.tipCents > 0 && <Pressable disabled={busy} style={styles.noteChip} onPress={() => setRefundTip(!refundTip)}><Text style={styles.noteChipText}>{refundTip ? '✓ ' : ''}{t('Devolver gorjeta')}: {money(remaining.tipCents)}</Text></Pressable>}
      {remaining.deliveryFeeCents + remaining.deliveryTaxCents > 0 && <Pressable disabled={busy} style={styles.noteChip} onPress={() => setRefundFee(!refundFee)}><Text style={styles.noteChipText}>{refundFee ? '✓ ' : ''}{t('Devolver taxa de entrega e seu imposto')}: {money(remaining.deliveryFeeCents + remaining.deliveryTaxCents)}</Text></Pressable>}
    </>}
    {preview && <><Text style={styles.cardTitle}>{t('Devolução')}: {money(preview.amountCents)}</Text>{preview.payments.map((payment: Payment) => <Text key={payment.method} style={styles.mutedText}>{t(payment.method === 'cash' ? 'Dinheiro' : payment.method === 'card' ? 'Cartão' : 'Zelle')}: {money(payment.amountCents)}</Text>)}</>}
    <Text style={styles.fieldLabel}>{t('Motivo obrigatório')}</Text><TextInput editable={!busy} value={reason} onChangeText={setReason} style={styles.input} maxLength={1000} accessibilityLabel={t('Motivo obrigatório')} />
    {!!error && <Text style={styles.errorText}>{t(error)}</Text>}
    <Pressable disabled={busy || !reason.trim() || !preview} style={styles.secondaryWideButton} onPress={() => Alert.alert(t('Confirmar devolução'), `${money(preview!.amountCents)} · ${reason.trim()}`, [{ text: t('Cancelar') }, { text: t('Confirmar'), onPress: () => { void onConfirm(reason.trim(), input()).catch(e => setError(e.message)); } }])}><Text style={styles.secondaryButtonText}>{t('Confirmar devolução')}</Text></Pressable>
    <Pressable disabled={busy} style={styles.cancelButton} onPress={onClose}><Text style={styles.cancelButtonText}>{t('Fechar')}</Text></Pressable>
  </View>;
}
