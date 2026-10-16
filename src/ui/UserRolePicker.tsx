import { Text, View } from './ThemedNative';
import { APP_ROLES, ROLE_LABELS, type AppRole } from '../../shared/app-roles.mjs';
import { useLanguage } from '../i18n/LanguageContext';
import { KeyboardPressable as Pressable } from './KeyboardControls';
import { styles } from './theme';

export function UserRolePicker({ value, onChange, disabled }: { value: AppRole; onChange: (role: AppRole) => void; disabled: boolean }) {
  const { t } = useLanguage();
  return <View><Text style={styles.fieldLabel}>{t('Perfil de acesso')}</Text><View style={styles.quickNotes}>
    {APP_ROLES.map(role => <Pressable key={role} accessibilityRole="radio" accessibilityLabel={t(ROLE_LABELS[role])} accessibilityState={{ checked: value === role }} aria-checked={value === role} disabled={disabled} onPress={() => onChange(role)} style={[styles.noteChip, { minHeight: 44, justifyContent: 'center' }, value === role && styles.selectedCategory]}><Text style={[styles.noteChipText, value === role && styles.selectedCategoryText]}>{t(ROLE_LABELS[role])}</Text></Pressable>)}
  </View></View>;
}
