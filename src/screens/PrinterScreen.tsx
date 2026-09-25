import { Pressable, Text, TextInput, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { styles, COLORS, CONNECTIONS } from '../ui/theme';

export default function PrinterScreen() {
  const { printerSettings, updatePrinterSettings, isWide, savePrinterSettings, testPrinter, menuUpdateStatus, updateMenu, updatingMenu } = useApp();
  return <ScreenFrame><View style={[styles.columns, isWide && styles.columnsWide]}>
                  <View style={[styles.panel, styles.column, isWide && styles.columnWide]}>
                    <Text style={styles.panelTitle}>Impressora</Text>
                    <Text style={styles.settingsIntro}>Escolha a conexão e a largura do papel para suas comandas.</Text>
                    <Text style={styles.label}>Método de conexão</Text>
                    <View style={styles.connectionList}>
                      {CONNECTIONS.map((option) => <Pressable key={option.value} onPress={() => updatePrinterSettings({ connection: option.value })} accessibilityRole="radio" accessibilityState={{ checked: option.value === printerSettings.connection }} style={[styles.connectionOption, option.value === printerSettings.connection && styles.selectedConnection]}>
                        <Text style={[styles.connectionText, option.value === printerSettings.connection && styles.selectedConnectionText]}>{option.label}</Text>
                        {option.value === printerSettings.connection && <Text style={styles.selectedConnectionText}>✓</Text>}
                      </Pressable>)}
                    </View>
                    <Text style={styles.fieldLabel}>Nome da impressora</Text>
                    <TextInput value={printerSettings.name} onChangeText={(name) => updatePrinterSettings({ name })} accessibilityLabel="Nome da impressora" placeholder="Opcional" placeholderTextColor={COLORS.placeholder} style={styles.input} />
                    <Text style={styles.fieldLabel}>Endereço ou identificador</Text>
                    <TextInput value={printerSettings.address} onChangeText={(address) => updatePrinterSettings({ address })} accessibilityLabel="Endereço da impressora" placeholder={printerSettings.connection === 'wifi' ? 'Endereço IP da impressora' : 'Endereço, MAC ou identificador'} placeholderTextColor={COLORS.placeholder} style={styles.input} autoCapitalize="none" />
                    <Text style={styles.fieldLabel}>Porta de rede</Text>
                    <TextInput value={printerSettings.port} onChangeText={(port) => updatePrinterSettings({ port })} accessibilityLabel="Porta de rede" placeholder="9100" placeholderTextColor={COLORS.placeholder} style={styles.input} keyboardType="number-pad" />
                    <Text style={styles.fieldLabel}>Largura do papel</Text>
                    <View style={styles.paperOptions}>{(['58', '80'] as const).map((width) => <Pressable key={width} onPress={() => updatePrinterSettings({ paperWidth: width })} accessibilityRole="radio" accessibilityState={{ checked: width === printerSettings.paperWidth }} style={[styles.paperOption, width === printerSettings.paperWidth && styles.selectedConnection]}><Text style={[styles.connectionText, width === printerSettings.paperWidth && styles.selectedConnectionText]}>{width} mm</Text></Pressable>)}</View>
                    <Pressable style={styles.sendButton} onPress={savePrinterSettings}><Text style={styles.sendButtonText}>Salvar configurações</Text></Pressable>
                    <Pressable style={styles.secondaryWideButton} onPress={testPrinter}><Text style={styles.secondaryButtonText}>Testar impressora</Text></Pressable>
                  </View>
                  <View style={[styles.panel, styles.column, isWide && styles.columnWide]}>
                    <Text style={styles.panelTitle}>Cardápio online</Text>
                    <Text style={styles.settingsIntro}>Verificamos atualizações ao abrir o aplicativo. Você também pode atualizar quando quiser.</Text>
                    <Text style={styles.helperText}>{menuUpdateStatus || 'Seu cardápio fica disponível mesmo sem internet.'}</Text>
                    <Pressable disabled={updatingMenu} accessibilityState={{ disabled: updatingMenu, busy: updatingMenu }} style={[styles.secondaryWideButton, updatingMenu && styles.pressed]} onPress={() => updateMenu(true)}><Text style={styles.secondaryButtonText}>{updatingMenu ? 'Verificando…' : 'Atualizar cardápio'}</Text></Pressable>
                  </View>
                </View></ScreenFrame>;
}
