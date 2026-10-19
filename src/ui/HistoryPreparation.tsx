import { useLanguage } from '../i18n/LanguageContext';
import { historyPreparation } from '../services/historyPreparation';
import { Text, View } from './ThemedNative';
import { styles } from './theme';

type Summary = NonNullable<ReturnType<typeof historyPreparation>>;
export function HistoryPreparationBadge({ summary }: { summary: Summary }) {
  const { t } = useLanguage();
  return <View testID="history-preparation-status" style={{ alignSelf: 'flex-start', maxWidth: '100%', borderWidth: 1, borderColor: styles.historyCard.borderColor, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 }}>
    <Text style={styles.historyCount}>{t(summary.label)}</Text>
  </View>;
}
export function HistoryPreparationTimeline({ summary }: { summary: Summary }) {
  const { t, locale } = useLanguage();
  return <View testID="history-preparation-timeline" style={{ gap: 10 }}>
    <Text style={styles.cardTitle}>{t('Preparo do pedido')}</Text>
    <HistoryPreparationBadge summary={summary} />
    {summary.times.map(({ label, at }) => <View key={label} style={{ gap: 2 }}>
      <Text style={styles.helperText}>{t(label)}</Text>
      <Text style={styles.cardTitle}>{at ? new Date(at).toLocaleString(locale) : t('Horário não registrado')}</Text>
    </View>)}
  </View>;
}
