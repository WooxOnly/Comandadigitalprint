import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from './KeyboardControls';
import { appStorage, cloud } from '../services/cloudStorage';
import { useLanguage } from '../i18n/LanguageContext';
import { styles } from './theme';

type Device = { id: string; name: string };
export function TabletSettings() {
  const { t } = useLanguage();
  const id = cloud.identity();
  const [name, setName] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  useEffect(() => {
    let active = true;
    void cloud.get('device:' + id).then((v) => { if (active && v) setName((v as Device).name); });
    const refresh = () => { void cloud.list('device:').then((v) => { if (active) setDevices(v as Device[]); }); };
    refresh(); const stop = cloud.subscribe(refresh);
    return () => { active = false; stop(); };
  }, [id]);
  async function save() {
    try { await cloud.write({ ['device:' + id]: { id, name: name.trim() } }); }
    catch { Alert.alert(t('Falha ao salvar'), t('Informe um nome para o tablet.')); }
  }
  async function copy(source: string) {
    try {
      const printer = await cloud.get('printer:' + source);
      const language = await cloud.get('language:' + source);
      if (printer) await appStorage.setItem('@comandadigitalprint/printer-settings', JSON.stringify(printer));
      if (typeof language === 'string') await appStorage.setItem('@comandadigitalprint/language', language);
      Alert.alert(t('Configuração salva'));
    } catch { Alert.alert(t('Falha ao salvar')); }
  }
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>{t('Este tablet')}</Text>
    <Text style={styles.mutedText}>{id}</Text>
    <TextInput accessibilityLabel={t('Nome do tablet')} value={name} onChangeText={setName} maxLength={80} style={styles.input} />
    <Pressable onPress={save} style={styles.secondaryWideButton}><Text style={styles.secondaryButtonText}>{t('Salvar nome do tablet')}</Text></Pressable>
    <Text style={styles.helperText}>{t('Impressora e idioma são separados por tablet. Após reinstalar, você pode copiar as preferências do aparelho anterior.')}</Text>
    {devices.filter((device) => device.id !== id).map((device) => <Pressable key={device.id} style={styles.secondaryWideButton} onPress={() => Alert.alert(t('Copiar preferências'), device.name + ' · ' + device.id.slice(0, 8), [{ text: t('Cancelar') }, { text: t('Copiar'), onPress: () => { void copy(device.id); } }])}><Text style={styles.secondaryButtonText}>{t('Copiar preferências')}: {device.name}</Text></Pressable>)}
  </View>;
}
