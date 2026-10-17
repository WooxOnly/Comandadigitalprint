import { useAppearance } from './AppearanceContext';
import { roleScreen, pathScreen } from '../../shared/app-roles.mjs';
import { useAppRole } from './useAppRole';
import { useAuth } from '../state/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useEffect, useRef, type ReactNode } from 'react';
import { router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, type ScrollViewRef, Text, useWindowDimensions, View, SafeAreaView } from './ThemedNative';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { TOPPINGS } from '../../menuData';
import { describeExtra } from '../../orderItems';
import { useApp } from '../state/AppContext';
import { styles, COLORS, TABS, ROUTES, navigationTabs } from './theme';
import { CloudStatus } from './CloudStatus';
import { ReceiptPreview } from './ReceiptPreview';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from './KeyboardControls';
import { NavigationIcon } from './NavigationIcon';
import { useStoreModules } from './useStoreModules';
import { useStoreName } from './useStoreName';
export function AppShell({ children }: { children: ReactNode }) {
  const { t, language } = useLanguage();
  const { theme } = useAppearance();
  const storeName = useStoreName();
  const path = usePathname();
  const modules = useStoreModules();
  const role = useAppRole();
  const { logout } = useAuth();
  const tabs = navigationTabs(modules, role);
  const permitted = roleScreen(role,pathScreen(path),modules);
  const landing = tabs[0] ? ROUTES[tabs[0].screen] : '/preparation';
  useEffect(()=>{if(!permitted && path!==landing)router.replace(landing)},[permitted,path,landing]);
  const activeTab = tabs.find((tab) => ROUTES[tab.screen] === path || (tab.screen === 'history' && path.startsWith('/history/')) || (tab.screen === 'cash' && path === '/cash-reports') || (tab.screen === 'printer' && path === '/backups'));
  const currentTab = activeTab || TABS[0];
  const kitchen = path === '/preparation';
  const moduleTitle = path === '/backups' ? 'Recuperação de dados' : path === '/preparation' ? 'Painel de preparo' : path === '/customers' ? 'Cadastro de Clientes' : path === '/preorders' ? 'Encomendas' : path === '/cash' ? 'Caixa' : path === '/cash-reports' ? 'Relatórios do Caixa' : null;
  const screen = activeTab?.screen;
  const { isReady, sending, chooseLogo, logoUri, isWide, feedback, selectedProduct, setSelectedProduct, pizzaMode, setPizzaMode, secondFlavor, setSecondFlavor, extras, setExtras, extraPlacement, setExtraPlacement, pizzaMenu, productNote, setProductNote, addSelectedProduct } = useApp();
  const { width, fontScale } = useWindowDimensions();
  const navScroll = useRef<ScrollViewRef>(null);
  const minTabWidth = fontScale >= 1.4 ? 108 : 60;
  const navSpacing = 12 + 2 * Math.max(0, tabs.length - 1);
  const navWidth = Math.max(Math.min(width, 80 * tabs.length + navSpacing), minTabWidth * tabs.length + navSpacing);
  const selectedIndex = Math.max(0, tabs.findIndex(tab => tab.screen === screen));
  const selectedOffset = Math.max(0, (selectedIndex + 0.5) * (navWidth / Math.max(1,tabs.length)) - width / 2);
  useEffect(() => { navScroll.current?.scrollTo({ x: selectedOffset, animated: false }); }, [selectedOffset]);
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SafeAreaView testID="app-surface" style={styles.container}>
        {!isReady && <Text style={styles.helperText}>{t("Carregando dados salvos…")}</Text>}
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View pointerEvents={sending || !isReady ? 'none' : 'auto'} style={[styles.header, isWide && styles.headerWide, kitchen && { paddingVertical: 6, maxWidth: '100%' }]}>
            <Pressable disabled={role !== 'admin'} accessible={role === 'admin'} onPress={chooseLogo} accessibilityRole="button" accessibilityLabel={t("Escolher logotipo do restaurante")} style={({ pressed }) => [styles.logoButton, isWide && styles.logoButtonWide, kitchen && { width: 32, height: 32, borderRadius: 8 }, pressed && styles.pressed]}>
              <Image source={logoUri ? { uri: logoUri } : require('../../assets/chef-icon.png')} style={styles.logoImage} />
            </Pressable>
            <View style={styles.headerTitle}>
              <Text numberOfLines={1} style={styles.eyebrow}>BistroHub · {storeName}</Text>
              <Text style={[styles.title, kitchen && { fontSize: 18 }]}>{t(moduleTitle || (path.startsWith('/history/') ? 'Detalhes do pedido' : currentTab.title))}</Text>
            </View>
            {role === 'cook' && <Pressable accessibilityRole="button" accessibilityLabel={t('Sair do sistema')} onPress={logout} style={styles.noteChip}><Text style={styles.noteChipText}>{t('Sair do sistema')}</Text></Pressable>}
            {isWide && !kitchen && <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>{t("Do pedido à cozinha")}</Text></View>}
          </View>

          <CloudStatus compact={kitchen} />
          <View style={styles.flex}>{permitted ? children : <View style={styles.panel}><Text style={styles.panelTitle}>{t('Acesso restrito')}</Text><Text style={styles.helperText}>{t('Seu perfil não tem acesso a esta tela ou o módulo está desativado.')}</Text><Pressable style={styles.cancelButton} onPress={logout}><Text style={styles.cancelButtonText}>{t('Sair do sistema')}</Text></Pressable></View>}</View>

          {feedback && <View accessibilityLiveRegion="polite" style={[styles.feedbackToast, feedback.tone === 'error' ? styles.feedbackError : styles.feedbackSuccess]}><Text style={styles.feedbackTitle}>{t(feedback.title)}</Text><Text style={styles.feedbackMessage}>{t(feedback.message)}</Text></View>}

          {tabs.length > 0 && <View pointerEvents={sending || !isReady ? 'none' : 'auto'} style={styles.navBackground} testID="bottom-navigation">
            <ScrollView ref={navScroll} horizontal showsHorizontalScrollIndicator={navWidth > width} style={{ flexGrow: 0 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} onContentSizeChange={() => navScroll.current?.scrollTo({ x: selectedOffset, animated: false })}>
              <View testID="navigation-content" style={[styles.bottomNav, { width: navWidth, maxWidth: navWidth }]}>
                {tabs.map((tab) => <Pressable testID={'nav-' + tab.screen} key={tab.screen} accessibilityRole="tab" accessibilityLabel={t(tab.title)} accessibilityState={{ selected: screen === tab.screen }} aria-selected={screen === tab.screen} onPress={() => router.navigate(ROUTES[tab.screen])} style={({ pressed }) => [styles.bottomNavButton, isWide && styles.bottomNavButtonWide, screen === tab.screen && styles.activeBottomNavButton, kitchen && { paddingVertical: 4, minHeight: 44 }, pressed && styles.pressed]}>
                  <View style={{ marginBottom: 2 }}><NavigationIcon icon={tab.icon} size={18} color={screen === tab.screen ? COLORS.primary : COLORS.muted} /></View>
                  <Text numberOfLines={2} style={[styles.bottomNavText, screen === tab.screen && styles.activeBottomNavText]}>{t(tab.label)}</Text>
                </Pressable>)}
              </View>
            </ScrollView>
          </View>}
        </KeyboardAvoidingView>

        <Modal visible={selectedProduct !== null && roleScreen(role,'order',modules)} transparent animationType={isWide ? 'fade' : 'slide'} onRequestClose={() => setSelectedProduct(null)}>
          <SafeAreaProvider><KeyboardAvoidingView style={[styles.modalBackdrop, isWide && styles.modalBackdropWide]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <SafeAreaView edges={['bottom']} style={[styles.productModal, isWide && styles.productModalWide]}>
              <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.modalContent}>
                <Text style={styles.modalEyebrow}>{t("ADICIONAR AO PEDIDO")}</Text>
                <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
                <Text style={styles.settingsIntro}>{selectedProduct?.description || t("Como você quer este produto?")}</Text>
                {selectedProduct?.kind === 'pizza' && <>
                  {selectedProduct.allowsExtras === false ? <Text style={styles.helperText}>{t("Pizza promocional: somente inteira e sem adicionais.")}</Text> : <>
                    <Text style={styles.fieldLabel}>{t("1. Inteira ou dois sabores?")}</Text>
                    <View style={styles.quickNotes}>{([{ value: 'whole', label: t("Inteira") }, { value: 'halves', label: t("Dois sabores") }] as const).map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: pizzaMode === option.value }} onPress={() => { if (pizzaMode === option.value) return; setPizzaMode(option.value); setSecondFlavor(null); setExtras([]); setExtraPlacement('whole'); }} style={[styles.noteChip, pizzaMode === option.value && styles.selectedCategory]}><Text style={[styles.noteChipText, pizzaMode === option.value && styles.selectedCategoryText]}>{t(option.label)}</Text></Pressable>)}</View>
                  </>}
                  {pizzaMode === 'halves' && <>
                    <Text style={styles.fieldLabel}>{t("2. Qual é o outro sabor?")}</Text>
                    <Text style={styles.helperText}>{t("1ª metade:")} {selectedProduct.name}</Text>
                    <View style={styles.quickNotes}>{pizzaMenu.filter((pizza) => pizza.id !== selectedProduct.id && pizza.allowsExtras !== false).map((pizza) => <Pressable key={pizza.id} accessibilityRole="radio" accessibilityState={{ checked: secondFlavor?.id === pizza.id }} onPress={() => setSecondFlavor(pizza)} style={[styles.noteChip, secondFlavor?.id === pizza.id && styles.selectedCategory]}><Text style={[styles.noteChipText, secondFlavor?.id === pizza.id && styles.selectedCategoryText]}>{pizza.name}</Text></Pressable>)}</View>
                  </>}
                  {selectedProduct.allowsExtras !== false && pizzaMode && (pizzaMode === 'whole' || secondFlavor) && <>
                    <Text style={styles.fieldLabel}>{t("Extras (opcional)")}</Text>
                    {pizzaMode === 'halves' && <View style={styles.quickNotes}>{([{ value: 'whole', label: t("Pizza inteira") }, { value: 'first', label: t("1ª metade: ") + selectedProduct.name }, { value: 'second', label: t("2ª metade: ") + secondFlavor?.name }] as const).map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: extraPlacement === option.value }} onPress={() => setExtraPlacement(option.value)} style={[styles.noteChip, extraPlacement === option.value && styles.selectedCategory]}><Text style={[styles.noteChipText, extraPlacement === option.value && styles.selectedCategoryText]}>{t(option.label)}</Text></Pressable>)}</View>}
                    <View style={styles.quickNotes}>{TOPPINGS.map((name) => {
                      const checked = extras.some((extra) => extra.name === name && extra.placement === extraPlacement);
                      return <Pressable key={name} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => setExtras((current) => checked ? current.filter((extra) => !(extra.name === name && extra.placement === extraPlacement)) : [...current.filter((extra) => extra.name !== name || (extra.placement !== 'whole' && extraPlacement !== 'whole')), { name, placement: extraPlacement }])} style={[styles.noteChip, checked && styles.selectedCategory]}><Text style={[styles.noteChipText, checked && styles.selectedCategoryText]}>{checked ? '✓ ' : '+ '}{name}</Text></Pressable>;
                    })}</View>
                    {extras.length > 0 && <Text style={styles.helperText}>{extras.map((extra) => '+ ' + describeExtra(extra, [selectedProduct.name, secondFlavor?.name || ''], language)).join('\n')}</Text>}
                  </>}
                </>}
                <Text style={styles.fieldLabel}>{t("Observação (opcional)")}</Text>
                <TextInput value={productNote} onChangeText={setProductNote} accessibilityLabel={t("Observação do produto")} placeholder={t("Ex.: bem passado, sem molho...")} placeholderTextColor={COLORS.placeholder} style={[styles.input, styles.modalInput]} multiline />
                <View style={styles.quickNotes}>{[t("Sem cebola"), t("Sem pimenta"), t("Bem passado")].map((note) => <Pressable key={t(note)} onPress={() => setProductNote((current) => current ? current + ', ' + note : note)} style={styles.noteChip}><Text style={styles.noteChipText}>{t(note)}</Text></Pressable>)}</View>
                <Pressable disabled={selectedProduct?.kind === 'pizza' && (!pizzaMode || (pizzaMode === 'halves' && !secondFlavor))} style={[styles.sendButton, selectedProduct?.kind === 'pizza' && (!pizzaMode || (pizzaMode === 'halves' && !secondFlavor)) && styles.pressed]} onPress={addSelectedProduct}><Text style={styles.sendButtonText}>{t("Adicionar ao pedido")}</Text></Pressable>
                <Pressable style={styles.cancelButton} onPress={() => setSelectedProduct(null)}><Text style={styles.cancelButtonText}>{t("Cancelar")}</Text></Pressable>
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView></SafeAreaProvider>
        </Modal>
        {permitted && <ReceiptPreview />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
