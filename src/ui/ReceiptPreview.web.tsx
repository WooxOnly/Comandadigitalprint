import { buildPrintPlan } from '../services/printerRouting';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, Text, useWindowDimensions, View, SafeAreaView } from './ThemedNative';
import { KeyboardPressable as Pressable } from './KeyboardControls';
import { BrowserReceiptFrame as WebView, type BrowserReceiptFrameHandle } from './BrowserReceiptFrame';
import { buildOrderHtml, type PrintableOrder } from '../../printerService';
import { useLanguage } from '../i18n/LanguageContext';
import { useApp } from '../state/AppContext';
import { COLORS, styles } from './theme';

const DEFAULT_PREVIEW_ZOOM = 75;

export function ReceiptPreview() {
  const { previewOrder } = useApp();
  return previewOrder ? <ReceiptPreviewContent key={previewOrder.id} order={previewOrder} /> : null;
}

function ReceiptPreviewContent({ order }: { order: PrintableOrder & { id: string } }) {
  const { t, language } = useLanguage();
  const { printedDestinations, setPreviewOrder, printerSettings, printing, confirmPrint } = useApp();
  const { width, height } = useWindowDimensions();
  const shortScreen = height < 500;
  const webView = useRef<BrowserReceiptFrameHandle>(null);
  const [destinationId, setDestinationId] = useState('default');
  const [zoom, setZoom] = useState(DEFAULT_PREVIEW_ZOOM);

  useEffect(() => {
    webView.current?.injectJavaScript(`document.documentElement.style.zoom = '${zoom}%'; true;`);
  }, [zoom]);

  const destinations = useMemo(() => { try { return buildPrintPlan(order, printerSettings); } catch { return []; } }, [order, printerSettings]);
  const activeDestination = destinations.find(destination => destination.id === destinationId) ?? destinations[0];
  const shownOrder = activeDestination?.order ?? order, shownWidth = activeDestination?.settings.paperWidth ?? printerSettings.paperWidth;
  const html = useMemo(() => buildOrderHtml(shownOrder, shownWidth, language).replace('</head>', `<style>@media screen { html { zoom: ${DEFAULT_PREVIEW_ZOOM}%; } body { max-width: none; } }</style></head>`), [shownOrder, shownWidth, language]);
  const source = useMemo(() => ({ html }), [html]);
  const paperWidth = Math.min(Math.round(Number(shownWidth) * 96 / 25.4), width - 32);
  const close = () => { if (!printing) setPreviewOrder(null); };

  return <Modal visible animationType="slide" onRequestClose={close}>
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16 }}>
        <View style={{ flex: 1 }}><Text style={styles.panelTitle}>{t('Prévia da comanda')}</Text><Text style={styles.mutedText}>{shownWidth} mm</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Fechar prévia')} onPress={close} style={styles.previewControl}><Text style={styles.previewControlText}>×</Text></Pressable>
      </View>
      <View style={{ flex: 1, alignItems: 'center', paddingBottom: 8 }}>
        <WebView ref={webView} originWhitelist={['*']} source={source} onLoadEnd={() => webView.current?.injectJavaScript(`document.documentElement.style.zoom = '${zoom}%'; true;`)} style={{ width: paperWidth, flex: 1, backgroundColor: '#fff' }} />
      </View>
      <View style={{ padding: shortScreen ? 8 : 16, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, gap: shortScreen ? 8 : 12 }}>
        <ScrollView style={{ maxHeight: Math.min(160, height * 0.2) }} contentContainerStyle={{ gap: 6 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {destinations.map(destination => <Pressable key={destination.id} style={styles.noteChip} onPress={() => setDestinationId(destination.id)}><Text style={styles.helperText}>{printedDestinations.includes(destination.id) ? '✓ ' : ''}{destination.id === 'default' && !printerSettings.name ? t('Impressora principal') : destination.label} · {destination.order.items.length} {t(destination.order.items.length === 1 ? 'item' : 'itens')}</Text></Pressable>)}
        </ScrollView>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('Reduzir zoom')} disabled={zoom <= 25} onPress={() => setZoom(value => Math.max(25, value - 25))} style={styles.previewControl}><Text style={styles.previewControlText}>−</Text></Pressable>
          <Text style={styles.previewZoom}>{zoom}%</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('Ampliar zoom')} disabled={zoom >= 200} onPress={() => setZoom(value => Math.min(200, value + 25))} style={styles.previewControl}><Text style={styles.previewControlText}>+</Text></Pressable>
        </View>
        <Pressable accessibilityRole="button" disabled={printing} onPress={confirmPrint} style={[styles.sendButton, { marginTop: 0 }, printing && styles.pressed]}><Text style={styles.sendButtonText}>{t(printing ? printerSettings.connection === 'wifi' ? 'Enviando impressão…' : 'Abrindo impressão…' : 'Imprimir comanda')}</Text></Pressable>
      </View>
    </SafeAreaView>
  </Modal>;
}
