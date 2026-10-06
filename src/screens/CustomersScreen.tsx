import { useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { ScreenFrame } from '../ui/ScreenFrame';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from '../ui/KeyboardControls';
import { styles } from '../ui/theme';
import { useBusiness } from '../state/BusinessContext';
import { useLanguage } from '../i18n/LanguageContext';
import { cloud } from '../services/cloudStorage';
import type { Customer, CustomerHistory } from '../services/business';
import { formatMoney } from '../services/business';
const statusLabels = { scheduled: 'Agendada', preparing: 'Em preparo', ready: 'Pronta', completed: 'Concluída', cancelled: 'Cancelada' };
export default function CustomersScreen() {
  const { modules, customers, preorders, busy, saveCustomer } = useBusiness(), { t, locale } = useLanguage();
  const [search, setSearch] = useState(''), [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Customer | 'new' | null>(null);
  const [name, setName] = useState(''), [phone, setPhone] = useState(''), [email, setEmail] = useState(''), [addresses, setAddresses] = useState(''), [notes, setNotes] = useState('');
  const [error, setError] = useState(''), [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null), [history, setHistory] = useState<CustomerHistory | null>(null), [loading, setLoading] = useState(false);
  const historyRequest = useRef(0);
  if (!modules.customers) return <ScreenFrame><Text style={styles.settingsIntro}>{t('Módulo não habilitado para esta empresa.')}</Text></ScreenFrame>;
  function edit(customer: Customer | 'new') { setEditing(customer); setName(customer === 'new' ? '' : customer.name); setPhone(customer === 'new' ? '' : customer.phone); setEmail(customer === 'new' ? '' : customer.email); setAddresses(customer === 'new' ? '' : customer.addresses.join('\n')); setNotes(customer === 'new' ? '' : customer.notes); setError(''); }
  async function save() {
    try {
      const values = addresses.split('\n').map(value => value.trim()).filter(Boolean);
      if (!name.trim() || (!phone.trim() && !email.trim()) || values.length > 10 || values.some(value => value.length > 1000)) throw new Error('Informe nome e telefone ou e-mail, com até dez endereços.');
      await saveCustomer({ name: name.trim(), phone: phone.trim(), email: email.trim(), addresses: values, notes: notes.trim(), active: editing === 'new' ? true : editing!.active }, editing === 'new' ? undefined : editing!.id);
      setEditing(null); setError('');
    } catch (e) { setError((e as Error).message); }
  }
  async function loadHistory(customer: Customer) {
    const request = ++historyRequest.current; setHistoryCustomer(customer); setHistory(null); setLoading(true); setError('');
    try { const result = await cloud.customerHistory(customer.id) as CustomerHistory; if (request === historyRequest.current) setHistory(result); }
    catch { if (request === historyRequest.current) setError('Conecte à internet para consultar o histórico completo. As encomendas salvas neste tablet aparecem abaixo.'); }
    finally { if (request === historyRequest.current) setLoading(false); }
  }
  const filtered = customers.filter(customer => (showArchived || customer.active) && `${customer.name} ${customer.phone} ${customer.email}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const localHistory = historyCustomer && modules.preorders ? preorders.filter(record => record.customerId === historyCustomer.id) : [];
  return <ScreenFrame><View style={{ gap: 12 }}>
    <Text style={styles.settingsIntro}>{t('Cadastre contatos e endereços. Este módulo pode ser usado sozinho.')}</Text>
    <Pressable disabled={busy} style={styles.sendButton} onPress={() => edit('new')}><Text style={styles.sendButtonText}>{t('Novo cliente')}</Text></Pressable>
    <TextInput value={search} onChangeText={setSearch} style={styles.input} maxLength={200} accessibilityLabel={t('Buscar cliente')} placeholder={t('Buscar cliente')} />
    <Pressable style={styles.noteChip} onPress={() => setShowArchived(!showArchived)}><Text style={styles.noteChipText}>{t(showArchived ? 'Ocultar arquivados' : 'Mostrar arquivados')}</Text></Pressable>
    {!!error && <Text style={styles.errorText} accessibilityLiveRegion="polite">{t(error)}</Text>}
    {editing && <View style={styles.panel}>
      {([[name, setName, 'Nome', 500], [phone, setPhone, 'Telefone', 200], [email, setEmail, 'E-mail', 200], [addresses, setAddresses, 'Endereços (um por linha)', 10010], [notes, setNotes, 'Observações', 4000]] as const).map(([value, setter, label, limit]) => <View key={label}><Text style={styles.fieldLabel}>{t(label)}</Text><TextInput value={value} onChangeText={setter} editable={!busy} maxLength={limit} multiline={label.startsWith('Endereços') || label === 'Observações'} style={styles.input} accessibilityLabel={t(label)} /></View>)}
      <Pressable disabled={busy} style={styles.sendButton} onPress={() => void save()}><Text style={styles.sendButtonText}>{t('Salvar cliente')}</Text></Pressable>
      <Pressable disabled={busy} style={styles.cancelButton} onPress={() => setEditing(null)}><Text style={styles.cancelButtonText}>{t('Fechar')}</Text></Pressable>
    </View>}
    {historyCustomer && <View style={styles.panel}><Text style={styles.panelTitle}>{t('Histórico do cliente')}: {historyCustomer.name}</Text>
      {loading && <Text style={styles.helperText}>{t('Carregando…')}</Text>}
      {(history?.preorders ?? localHistory).map(record => <Text key={record.id} style={styles.cardTitle}>{new Date(record.dueAt).toLocaleString(locale)} · {t(statusLabels[record.status])} · {record.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}</Text>)}
      {(history?.sales ?? []).map(sale => <Text key={sale.id} style={styles.cardTitle}>{new Date(sale.createdAt).toLocaleString(locale)} · {sale.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}{sale.totalCents !== undefined ? ` · ${formatMoney(sale.totalCents, locale)} · ${t('Devolvido')}: ${formatMoney(sale.refundedCents ?? 0, locale)}` : ''}</Text>)}
      {history && !history.preorders.length && !history.sales.length && <Text style={styles.helperText}>{t('Nenhum pedido vinculado a este cliente.')}</Text>}
      {history?.more && <Text style={styles.helperText}>{t('Mostrando os 100 registros mais recentes.')}</Text>}
      <Pressable style={styles.cancelButton} onPress={() => { historyRequest.current++; setHistoryCustomer(null); setHistory(null); setLoading(false); }}><Text style={styles.cancelButtonText}>{t('Fechar')}</Text></Pressable>
    </View>}
    {filtered.length > 100 && <Text style={styles.helperText}>{t('Mostrando os 100 primeiros clientes. Refine a busca para encontrar outros.')}</Text>}
    {filtered.slice(0, 100).map(customer => <View key={customer.id} style={styles.historyCard}><Text style={styles.cardTitle}>{customer.name}{!customer.active ? ` · ${t('Arquivado')}` : ''}</Text><Text style={styles.mutedText}>{customer.phone} {customer.email}{customer.addresses.length ? '\n' + customer.addresses.join('\n') : ''}{customer.notes ? '\n' + customer.notes : ''}</Text>
      <View style={styles.quickNotes}><Pressable disabled={busy} style={styles.noteChip} onPress={() => edit(customer)}><Text style={styles.noteChipText}>{t('Editar')}</Text></Pressable><Pressable disabled={loading} style={styles.noteChip} onPress={() => void loadHistory(customer)}><Text style={styles.noteChipText}>{t('Histórico')}</Text></Pressable><Pressable disabled={busy} style={styles.noteChip} onPress={() => Alert.alert(t(customer.active ? 'Arquivar cliente' : 'Reativar cliente'), customer.name, [{ text: t('Cancelar') }, { text: t('Confirmar'), onPress: () => { void saveCustomer({ ...customer, active: !customer.active }, customer.id).catch(e => setError(e.message)); } }])}><Text style={styles.noteChipText}>{t(customer.active ? 'Arquivar' : 'Reativar')}</Text></Pressable></View>
    </View>)}
    {!filtered.length && <Text style={styles.emptyText}>{t('Nenhum cliente encontrado.')}</Text>}
  </View></ScreenFrame>;
}
