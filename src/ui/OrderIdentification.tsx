import { useState } from 'react';
import { Text, View, StyleSheet, useWindowDimensions } from './ThemedNative';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from './KeyboardControls';
import { ServiceModeIcon } from './ServiceModeIcon';
import { useLanguage } from '../i18n/LanguageContext';
import { styles, COLORS, PLATES } from './theme';

type Props = {
  serviceMode: 'dine_in' | 'takeout' | null; customer: string; plate: string; customPlate: string;
  requireCustomer: boolean; requireTableForTakeout: boolean; disabled: boolean; error: string;
  onService: (mode: 'dine_in' | 'takeout') => void; onCustomer: (text: string) => void;
  onPlate: (text: string) => void; onCustom: (text: string) => void; onConfirm: () => void;
};
export function OrderIdentification(props: Props) {
  const { t } = useLanguage();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const single = width >= 700 && fontScale < 1.4;
  const compactRow = single && width < 850;
  const split = width >= 680 && fontScale < 1.4;
  const inlineTables = width >= 460 && fontScale < 1.4;
  const plateWidth = compactRow ? 24 : single ? Math.max(22, Math.min(32, Math.floor((width - 630) / 10))) : inlineTables ? Math.min(44, Math.floor((width - 242) / 10)) : 44;
  const required = props.serviceMode === 'dine_in' || props.requireTableForTakeout;
  const service = <View testID="order-service-group" style={single ? local.service : [local.field, { width: split ? (width - 10) / 2 : '100%' }]}>
    {!single && <Text style={local.label}>{t('Atendimento')}</Text>}
    <View testID="order-service-options" style={local.serviceRow}>{(['dine_in', 'takeout'] as const).map(mode => <Pressable key={mode} disabled={props.disabled} accessibilityRole="radio" accessibilityLabel={t(mode === 'dine_in' ? 'Para comer aqui' : 'Para levar')} accessibilityState={{ checked: props.serviceMode === mode, disabled: props.disabled }} aria-checked={props.serviceMode === mode} onPress={() => props.onService(mode)} style={[local.iconButton, props.serviceMode === mode && styles.selectedConnection]}><ServiceModeIcon mode={mode} selected={props.serviceMode === mode} /></Pressable>)}</View>
  </View>;
  const customer = <View testID="order-customer-group" style={single ? [local.customer, compactRow && local.customerCompact] : [local.field, { width: split ? (width - 10) / 2 : '100%' }]}>
    {!single && <Text style={local.label}>{t('Cliente')}{props.requireCustomer ? ' *' : ''}</Text>}
    <TextInput editable={!props.disabled} value={props.customer} onChangeText={text => props.onCustomer(text.slice(0, 20))} maxLength={20} accessibilityLabel={t(props.requireCustomer ? 'Nome do cliente, obrigatório' : 'Nome do cliente, opcional')} placeholder={t('Nome do cliente') + (props.requireCustomer ? ' *' : '')} style={[styles.input, local.input]} />
  </View>;
  const tables = <View style={single ? compactRow ? local.tablesCompact : local.tablesInline : [local.field, { width: inlineTables ? plateWidth * 10 + 36 : '100%' }]}>
    <Text style={[local.label, compactRow && local.compactLabel]}>{t('Mesa')}{required ? ' *' : ''}</Text>
    <View testID="order-table-choices" style={[local.plates, single && { width: plateWidth * 10 + 27, gap: 3 }]}>{PLATES.map(value => <Pressable key={value} disabled={props.disabled} accessibilityRole="radio" accessibilityLabel={t('Mesa ') + value} accessibilityState={{ checked: props.plate === value && !props.customPlate, disabled: props.disabled }} onPress={() => props.onPlate(value)} style={[styles.plate, local.plate, { width: plateWidth }, props.plate === value && !props.customPlate && styles.selectedPlate]}><Text style={[styles.plateText, props.plate === value && !props.customPlate && styles.selectedPlateText]}>{value}</Text></Pressable>)}</View>
  </View>;
  const custom = <View testID="order-custom-table-group" style={single ? compactRow ? local.customCompact : local.customInline : [local.custom, !inlineTables && { width: '100%', flexBasis: 'auto' }]}>
    <Text style={[local.label, single && { width: compactRow ? 64 : 72, fontSize: 11, lineHeight: 14 }]}>{t('Outra mesa')}</Text>
    <TextInput editable={!props.disabled} value={props.customPlate} onChangeText={text => props.onCustom(text.replace(/\D/g, '').slice(0, 3))} maxLength={3} keyboardType="number-pad" accessibilityLabel={t('Outro número de mesa')} placeholder={single ? '—' : t('Número')} style={[styles.input, local.input, single && { width: compactRow ? 64 : 52, paddingHorizontal: 8 }]} />
  </View>;
  const advance = <Pressable testID="confirm-order-identification" disabled={props.disabled} accessibilityRole="button" onPress={props.onConfirm} style={[local.advance, props.disabled && styles.pressed]}><Text style={local.advanceText}>{t('Avançar')}</Text></Pressable>;
  return <View testID="order-identification" style={[local.panel, single && { paddingVertical: 6, gap: 4 }]}>
    <Text style={local.title}>{t('Dados do pedido')}</Text>
    <View testID={single ? 'order-identity-single-row' : undefined} style={single ? [local.row, compactRow && local.rowCompact] : local.fields} onLayout={event => setWidth(event.nativeEvent.layout.width)}>{service}{customer}{single && <>{tables}{custom}{advance}</>}</View>
    {!single && <View testID="order-table-row" style={[local.footer, !inlineTables && { flexWrap: 'wrap' }]}>{tables}{custom}{advance}</View>}
    {!!props.error && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{t(props.error)}</Text>}
  </View>;
}
const local = StyleSheet.create({
  panel: { padding: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, gap: 8 },
  title: { fontSize: 14, lineHeight: 18, fontWeight: '800', color: COLORS.ink },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.ink },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  field: { minWidth: 0, gap: 4 }, service: { width: 92, flexShrink: 0 }, serviceRow: { flexDirection: 'row', gap: 4 },
  iconButton: { width: 44, minHeight: 44, padding: 0, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  rowCompact: { alignItems: 'flex-end', gap: 6 },
  customerCompact: { minWidth: 160, maxWidth: 176 },
  tablesCompact: { gap: 4, flexShrink: 0 },
  customCompact: { width: 64, gap: 4, flexShrink: 0 },
  compactLabel: { fontSize: 11, lineHeight: 14 },
  customer: { flex: 1, minWidth: 120, maxWidth: 220 }, input: { minWidth: 0, minHeight: 44, height: 44, paddingVertical: 6 },
  tablesInline: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  plates: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 }, plate: { minWidth: 0, minHeight: 44, paddingHorizontal: 0, paddingVertical: 6, borderRadius: 8 },
  customInline: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }, custom: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, gap: 4 },
  footer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  advance: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.primary, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }, advanceText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
