import { useLanguage } from '../i18n/LanguageContext';
import type { ReactNode } from 'react';
import { router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { TOPPINGS } from '../../menuData';
import { describeExtra } from '../../orderItems';
import { useApp } from '../state/AppContext';
import { styles, COLORS, TABS, ROUTES } from './theme';
export function AppShell({ children }: { children: ReactNode }) {
  const { t, language } = useLanguage();
  const path = usePathname();
  const currentTab = TABS.find((tab) => ROUTES[tab.screen] === path) || TABS[0];
  const screen = currentTab.screen;
  const { isReady, sending, chooseLogo, logoUri, isWide, feedback, selectedProduct, setSelectedProduct, pizzaMode, setPizzaMode, secondFlavor, setSecondFlavor, extras, setExtras, extraPlacement, setExtraPlacement, pizzaMenu, productNote, setProductNote, addSelectedProduct } = useApp();
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SafeAreaView style={styles.container}>
        {!isReady && <Text style={styles.helperText}>{t("Carregando dados salvos…")}</Text>}
        <StatusBar style="dark" />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View pointerEvents={sending || !isReady ? 'none' : 'auto'} style={[styles.header, isWide && styles.headerWide]}>
            <Pressable onPress={chooseLogo} accessibilityRole="button" accessibilityLabel={t("Escolher logotipo do restaurante")} style={({ pressed }) => [styles.logoButton, isWide && styles.logoButtonWide, pressed && styles.pressed]}>
              <Image source={logoUri ? { uri: logoUri } : require('../../assets/chef-icon.png')} style={styles.logoImage} />
            </Pressable>
            <View style={styles.headerTitle}>
              <Text style={styles.eyebrow}>{t("COMANDA DIGITAL")}</Text>
              <Text style={styles.title}>{t(currentTab.title)}</Text>
            </View>
            {isWide && <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>{t("Do pedido à cozinha")}</Text></View>}
          </View>

          <View style={styles.flex}>{children}</View>

          {feedback && <View accessibilityLiveRegion="polite" style={[styles.feedbackToast, feedback.tone === 'error' ? styles.feedbackError : styles.feedbackSuccess]}><Text style={styles.feedbackTitle}>{t(feedback.title)}</Text><Text style={styles.feedbackMessage}>{t(feedback.message)}</Text></View>}

          <View pointerEvents={sending || !isReady ? 'none' : 'auto'} style={styles.navBackground}><View style={[styles.bottomNav, isWide && styles.bottomNavWide]}>
            {TABS.map((tab) => <Pressable key={tab.screen} accessibilityRole="tab" accessibilityLabel={t(tab.title)} accessibilityState={{ selected: screen === tab.screen }} onPress={() => router.navigate(ROUTES[tab.screen])} style={({ pressed }) => [styles.bottomNavButton, isWide && styles.bottomNavButtonWide, screen === tab.screen && styles.activeBottomNavButton, pressed && styles.pressed]}>
              <Text style={[styles.bottomNavIcon, isWide && styles.bottomNavIconWide, screen === tab.screen && styles.activeBottomNavText]}>{tab.icon}</Text>
              <Text style={[styles.bottomNavText, screen === tab.screen && styles.activeBottomNavText]}>{t(tab.label)}</Text>
            </Pressable>)}
          </View></View>
        </KeyboardAvoidingView>

        <Modal visible={selectedProduct !== null} transparent animationType={isWide ? 'fade' : 'slide'} onRequestClose={() => setSelectedProduct(null)}>
          <SafeAreaProvider><KeyboardAvoidingView style={[styles.modalBackdrop, isWide && styles.modalBackdropWide]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <SafeAreaView edges={['bottom']} style={[styles.productModal, isWide && styles.productModalWide]}>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
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
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
