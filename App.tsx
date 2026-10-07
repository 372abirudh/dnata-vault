import React, { useCallback, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { StatusBar, setStatusBarStyle } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useStore } from './src/store';
import { C } from './src/theme/tokens';
import { Dialog } from './src/components/ds';
import { BrandSplash } from './src/components/splash';
import { DateHost, PickerHost, ScanHost, ToastHost } from './src/components/hosts';
import { CreateMenu, HomeScreen, NotificationsSheet, ProfileSheet } from './src/screens/home';
import { DocSheet, GrnDetail } from './src/screens/receipts/detail';
import { AssignSheet, GrnCreateSheet } from './src/screens/receipts/create';
import { VerifySheet } from './src/screens/receipts/verify';
import { VhrSheet } from './src/screens/receipts/vhr';
import { PaFilterSheet, PutawayDetail, PutawayPage, PutawayTaskSheet } from './src/screens/receipts/putaway';
import { OrderDetail, PodDocSheet } from './src/screens/orders/detail';
import { AllocSheet, OrderCreateSheet } from './src/screens/orders/create';
import { TaskSheet } from './src/screens/orders/task';

SplashScreen.preventAutoHideAsync().catch(() => {});

const GRN_SHEETS = { create: GrnCreateSheet, assign: AssignSheet, verify: VerifySheet, vhr: VhrSheet, putaway: PutawayTaskSheet, doc: DocSheet };

/** Layers mirror the prototype: list page, pushed detail pages, then sheets and app-wide overlays on top. */
function Root() {
  const s = useStore();
  const GrnSheet = s.grnSheet ? GRN_SHEETS[s.grnSheet] : null;
  return (
    <View style={{ flex: 1, backgroundColor: C.bgApp }}>
      <StatusBar style="light" />
      {s.section === 'receipts' && s.page === 'putaway' ? <PutawayPage /> : <HomeScreen />}

      {s.paDetail ? <PutawayDetail no={s.paDetail} /> : null}
      {s.grnActive ? <GrnDetail no={s.grnActive} /> : null}
      {s.orderActive ? <OrderDetail no={s.orderActive} /> : null}

      {s.paFilter ? <PaFilterSheet /> : null}
      {GrnSheet ? <GrnSheet key={`${s.grnSheet}-${s.sheetNo}`} /> : null}
      {s.orderCreate ? <OrderCreateSheet /> : null}
      {s.allocNo ? <AllocSheet no={s.allocNo} /> : null}
      {s.task ? <TaskSheet key={`${s.task}-${s.taskNo}`} /> : null}
      {s.podDoc ? <PodDocSheet no={s.podDoc} /> : null}
      <Dialog
        open={s.closeOpen} icon="lock" tone="primary" title="Close this GRN?"
        message="All packages are allocated to bins. Closing locks the record — documents and exports stay available."
        primaryLabel="Close GRN" secondaryLabel="Cancel"
        onPrimary={() => { s.closeGrn(s.sheetNo); s.set({ closeOpen: false }); s.flash(`${s.sheetNo} closed.`); }}
        onSecondary={() => s.set({ closeOpen: false })}
      />

      {s.createMenu ? <CreateMenu /> : null}
      {s.acct ? <ProfileSheet /> : null}
      {s.notif ? <NotificationsSheet /> : null}

      <ToastHost />
      <PickerHost />
      <DateHost />
      <ScanHost />
    </View>
  );
}

export default function App() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  // System screens (print, camera, pickers) can reset the status bar; restore light icons on return.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') setStatusBarStyle('light'); });
    return () => sub.remove();
  }, []);
  // Wait for receipts and orders saved on the device before showing the app.
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());
  useEffect(() => useStore.persist.onFinishHydration(() => setHydrated(true)), []);
  const ready = loaded && hydrated;
  const [intro, setIntro] = useState(true);
  const endIntro = useCallback(() => setIntro(false), []);
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.navy }} />;
  return (
    <SafeAreaProvider>
      <Root />
      {intro ? <BrandSplash onDone={endIntro} /> : null}
    </SafeAreaProvider>
  );
}
