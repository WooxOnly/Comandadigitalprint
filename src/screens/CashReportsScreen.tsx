import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useBusiness } from '../state/BusinessContext';
import { useAuth } from '../state/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from '../ui/KeyboardControls';
import { styles } from '../ui/theme';
import { formatMoney, type CashReport } from '../services/business';
import { reportPeriod } from '../services/cashReportCsv';
import { shareCashReport } from '../services/shareCashReport';
import { cloud } from '../services/cloudStorage';
import { logError } from '../services/diagnostics';

const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
export default function CashReportsScreen() {
  const { modules, overview } = useBusiness(), { currentUser } = useAuth(), { t, locale } = useLanguage();
  const [from, setFrom] = useState(today), [through, setThrough] = useState(today);
  const [report, setReport] = useState<CashReport | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [loadedFilters, setLoadedFilters] = useState('');
  const money = (cents: number) => formatMoney(cents, locale), signature = JSON.stringify([from, through]);
  const allowed = currentUser === 'admin' || !!overview?.settings?.managers.includes(currentUser);
  if (!modules.cash || !allowed) return <ScreenFrame><Text style={styles.settingsIntro}>{t(!modules.cash ? 'Módulo não habilitado para esta empresa.' : 'Somente gerentes e administradores podem consultar relatórios.')}</Text></ScreenFrame>;
  async function run(operation: () => Promise<void>) {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { await operation(); }
    catch (e) {
      logError('cash.report_failed', e);
      const code = (e as { code?: string }).code;
      const messages: Record<string, string> = { MANAGER_REQUIRED: 'Somente gerentes e administradores podem consultar relatórios.', MODULE_DISABLED: 'Módulo não habilitado para esta empresa.', INVALID_PERIOD: 'Informe um período válido em AAAA-MM-DD.', REPORT_TOO_LARGE: 'O período contém muitos registros. Selecione um intervalo menor.', UNAVAILABLE: 'Conecte à internet para consultar o relatório.', LOGIN_REQUIRED: 'Entre na nuvem para consultar o relatório.' };
      setError(messages[code || ''] || (e as Error).message);
    } finally { lock.current = false; setBusy(false); }
  }
  const current = report && loadedFilters === signature ? report : null;
  return <ScreenFrame><View style={{ gap: 12 }}>
    <Text style={styles.settingsIntro}>{t('Relatório da empresa com todos os tablets. As datas seguem o fuso horário deste aparelho.')}</Text>
    <Text style={styles.fieldLabel}>{t('Data inicial (AAAA-MM-DD)')}</Text><TextInput value={from} onChangeText={setFrom} editable={!busy} maxLength={10} style={styles.input} accessibilityLabel={t('Data inicial (AAAA-MM-DD)')} />
    <Text style={styles.fieldLabel}>{t('Data final (AAAA-MM-DD)')}</Text><TextInput value={through} onChangeText={setThrough} editable={!busy} maxLength={10} style={styles.input} accessibilityLabel={t('Data final (AAAA-MM-DD)')} />
    <Pressable accessibilityRole="button" disabled={busy} style={styles.sendButton} onPress={() => void run(async () => { const period = reportPeriod(from, through); const value = await cloud.cashReport(period.start, period.end, period.timeZone); setReport(value); setLoadedFilters(signature); })}><Text style={styles.sendButtonText}>{t(busy ? 'Carregando…' : 'Consultar relatório')}</Text></Pressable>
    {!!error && <Text style={styles.errorText} accessibilityLiveRegion="polite">{t(error)}</Text>}
    {current && <>
      <Text style={styles.helperText}>{current.storeName} · {current.timeZone} · {new Date(current.generatedAt).toLocaleString(locale)}</Text>
      <Pressable accessibilityRole="button" disabled={busy} style={styles.secondaryWideButton} onPress={() => void run(async () => {
        const period = reportPeriod(from, through), fresh = await cloud.cashReport(period.start, period.end, period.timeZone); setReport(fresh); await shareCashReport(fresh);
      })}><Text style={styles.secondaryButtonText}>{t('Exportar CSV')}</Text></Pressable>
      <View style={styles.panel}><Text style={styles.panelTitle}>{t('Resumo do período')}</Text>
        {([['Vendas brutas', current.totals.grossCents], ['Descontos', current.totals.discountCents], ['Imposto recebido', current.totals.taxCents], ['Cancelamentos e estornos', current.totals.reversedCents], ['Imposto devolvido', current.totals.taxReversedCents], ['Vendas líquidas sem imposto', current.totals.netSalesCents], ['Imposto líquido', current.totals.netTaxCents], ['Gorjetas recebidas', current.totals.tipCents], ['Gorjetas devolvidas', current.totals.tipReversedCents], ['Gorjetas líquidas', current.totals.netTipCents], ['Taxas de entrega recebidas', current.totals.deliveryFeeCents], ['Taxas de entrega devolvidas', current.totals.deliveryFeeReversedCents], ['Taxas de entrega líquidas', current.totals.netDeliveryFeeCents], ['Recebimentos líquidos com imposto, gorjeta e entrega', current.totals.netReceiptsCents], ['Entrada de dinheiro', current.totals.inCents], ['Saída de dinheiro', current.totals.outCents]] as const).map(([label, value]) => <Text key={label} style={styles.cardTitle}>{t(label)}: {money(value)}</Text>)}
      </View>
      <Text style={styles.sectionTitle}>{t('Por forma de pagamento')}</Text>
      {current.methods.map(row => <View key={row.method} style={styles.historyCard}><Text style={styles.cardTitle}>{t(row.method === 'cash' ? 'Dinheiro' : row.method === 'card' ? 'Cartão' : 'Zelle')}: {money(row.netCents)}</Text><Text style={styles.mutedText}>{t('Recebido')}: {money(row.receivedCents)} · {t('Devolvido')}: {money(row.reversedCents)}</Text></View>)}
      <Text style={styles.sectionTitle}>{t('Por dia')}</Text>
      {current.days.map(row => <View key={row.day} style={styles.historyCard}><Text style={styles.cardTitle}>{row.day} · {money(row.netReceiptsCents)}</Text><Text style={styles.mutedText}>{t('Vendas')}: {row.salesCount} · {t('Cancelamento')}: {row.voidCount} · {t('Estorno')}: {row.refundCount}</Text><Text style={styles.mutedText}>{t('Vendas líquidas sem imposto')}: {money(row.netSalesCents)} · {t('Imposto líquido')}: {money(row.netTaxCents)}</Text></View>)}
      <Text style={styles.sectionTitle}>{t('Por produto')}</Text>
      {current.products.length > 100 && <Text style={styles.helperText}>{t('A tela mostra os primeiros 100 registros. O CSV inclui todos os detalhes do período.')}</Text>}
      {current.products.slice(0, 100).map(row => <View key={row.id} style={styles.historyCard}><Text style={styles.cardTitle}>{row.name} · {money(row.netSalesCents)}</Text><Text style={styles.mutedText}>{row.category} · {t('Quantidade vendida')}: {row.soldQuantity} · {t('Quantidade devolvida')}: {row.reversedQuantity}</Text></View>)}
      <Text style={styles.sectionTitle}>{t('Fechamentos e diferenças')}</Text>
      {current.closings.length > 100 && <Text style={styles.helperText}>{t('A tela mostra os primeiros 100 registros. O CSV inclui todos os detalhes do período.')}</Text>}
      {current.closings.slice(0, 100).map(row => <View key={row.id} style={styles.historyCard}><Text style={styles.cardTitle}>{new Date(row.closedAt).toLocaleString(locale)} · {row.closedBy}</Text><Text style={styles.mutedText}>{t('Esperado')}: {money(row.expectedCents)} · {t('Contado')}: {money(row.countedCents)} · {t('Diferença')}: {money(row.differenceCents)}</Text><Text style={styles.mutedText}>{t('Tablet')}: {row.deviceId}</Text></View>)}
      <Text style={styles.sectionTitle}>{t('Registro de operações')}</Text>
      {current.movements.length > 100 && <Text style={styles.helperText}>{t('A tela mostra os primeiros 100 registros. O CSV inclui todos os detalhes do período.')}</Text>}
      {current.movements.slice(0, 100).map(row => <View key={row.kind + row.id} style={styles.historyCard}><Text style={styles.cardTitle}>{t(row.kind === 'sale' ? 'Recebimento' : row.kind === 'in' ? 'Entrada de dinheiro' : row.kind === 'out' ? 'Saída de dinheiro' : row.kind === 'void' ? 'Cancelamento' : 'Estorno')} · {money(row.amountCents)}</Text><Text style={styles.mutedText}>{new Date(row.createdAt).toLocaleString(locale)} · {row.actor}{row.reason ? ` · ${row.reason}` : ''}</Text><Text style={styles.mutedText}>{row.id}</Text></View>)}
      {!current.movements.length && <Text style={styles.emptyText}>{t('Nenhuma movimentação neste período.')}</Text>}
    </>}
  </View></ScreenFrame>;
}
