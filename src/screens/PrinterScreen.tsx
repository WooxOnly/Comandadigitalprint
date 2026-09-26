import { useLanguage } from '../i18n/LanguageContext';
import { LanguageSettings } from '../ui/LanguageSettings';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { styles, COLORS, CONNECTIONS } from '../ui/theme';

export default function PrinterScreen() {
  const { t } = useLanguage();
  const { printerSettings, updatePrinterSettings, isWide, savePrinterSettings, testPrinter, menuUpdateStatus, updateMenu, updatingMenu, orderSettings, setRequireCustomer, savingOrderSettings } = useApp();
  return <ScreenFrame><View style={[styles.columns, isWide && styles.columnsWide]}>
                  <View style={[styles.panel, styles.column, isWide && styles.columnWide]}>
                    <LanguageSettings />
                    <Text style={styles.panelTitle}>{t("Pedidos")}</Text>
                    <View style={styles.orderLine}>
                      <Text style={[styles.cardTitle, styles.productInfo]}>{t("Obrigar informar cliente")}</Text>
                      <Switch value={orderSettings.requireCustomer} onValueChange={setRequireCustomer} disabled={savingOrderSettings} accessibilityLabel={t("Obrigar informar cliente")} trackColor={{ false: COLORS.border, true: COLORS.green }} />
                    </View>
                    <Text style={styles.helperText}>{savingOrderSettings ? t("Salvando…") : t("Salvo automaticamente. Quando ativado, exige o nome do cliente antes de enviar a comanda.")}</Text>
                    <Text style={styles.sectionTitle}>{t("Impressora")}</Text>
                    <Text style={styles.settingsIntro}>{t("Escolha a conexão e a largura do papel para suas comandas.")}</Text>
                    <Text style={styles.label}>{t("Método de conexão")}</Text>
                    <View style={styles.connectionList}>
                      {CONNECTIONS.map((option) => <Pressable key={option.value} onPress={() => updatePrinterSettings({ connection: option.value })} accessibilityRole="radio" accessibilityState={{ checked: option.value === printerSettings.connection }} style={[styles.connectionOption, option.value === printerSettings.connection && styles.selectedConnection]}>
                        <Text style={[styles.connectionText, option.value === printerSettings.connection && styles.selectedConnectionText]}>{t(option.label)}</Text>
                        {option.value === printerSettings.connection && <Text style={styles.selectedConnectionText}>✓</Text>}
                      </Pressable>)}
                    </View>
                    <Text style={styles.fieldLabel}>{t("Nome da impressora")}</Text>
                    <TextInput value={printerSettings.name} onChangeText={(name) => updatePrinterSettings({ name })} accessibilityLabel={t("Nome da impressora")} placeholder={t("Opcional")} placeholderTextColor={COLORS.placeholder} style={styles.input} />
                    <Text style={styles.fieldLabel}>{t("Endereço ou identificador")}</Text>
                    <TextInput value={printerSettings.address} onChangeText={(address) => updatePrinterSettings({ address })} accessibilityLabel={t("Endereço da impressora")} placeholder={printerSettings.connection === 'wifi' ? t("Endereço IP da impressora") : t("Endereço, MAC ou identificador")} placeholderTextColor={COLORS.placeholder} style={styles.input} autoCapitalize="none" />
                    <Text style={styles.fieldLabel}>{t("Porta de rede")}</Text>
                    <TextInput value={printerSettings.port} onChangeText={(port) => updatePrinterSettings({ port })} accessibilityLabel={t("Porta de rede")} placeholder="9100" placeholderTextColor={COLORS.placeholder} style={styles.input} keyboardType="number-pad" />
                    <Text style={styles.fieldLabel}>{t("Largura do papel")}</Text>
                    <View style={styles.paperOptions}>{(['58', '80'] as const).map((width) => <Pressable key={width} onPress={() => updatePrinterSettings({ paperWidth: width })} accessibilityRole="radio" accessibilityState={{ checked: width === printerSettings.paperWidth }} style={[styles.paperOption, width === printerSettings.paperWidth && styles.selectedConnection]}><Text style={[styles.connectionText, width === printerSettings.paperWidth && styles.selectedConnectionText]}>{width} mm</Text></Pressable>)}</View>
                    <Pressable style={styles.sendButton} onPress={savePrinterSettings}><Text style={styles.sendButtonText}>{t("Salvar configurações")}</Text></Pressable>
                    <Pressable style={styles.secondaryWideButton} onPress={testPrinter}><Text style={styles.secondaryButtonText}>{t("Testar impressora")}</Text></Pressable>
                  </View>
                  <View style={[styles.panel, styles.column, isWide && styles.columnWide]}>
                    <Text style={styles.panelTitle}>{t("Cardápio online")}</Text>
                    <Text style={styles.settingsIntro}>{t("Verificamos atualizações ao abrir o aplicativo. Você também pode atualizar quando quiser.")}</Text>
                    <Text style={styles.helperText}>{t(menuUpdateStatus) || t("Seu cardápio fica disponível mesmo sem internet.")}</Text>
                    <Pressable disabled={updatingMenu} accessibilityState={{ disabled: updatingMenu, busy: updatingMenu }} style={[styles.secondaryWideButton, updatingMenu && styles.pressed]} onPress={() => updateMenu(true)}><Text style={styles.secondaryButtonText}>{updatingMenu ? t("Verificando…") : t("Atualizar cardápio")}</Text></Pressable>
                  </View>
                </View></ScreenFrame>;
}
