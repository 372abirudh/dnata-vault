/** App-wide overlays driven by the store: option picker, barcode scanner, date picker, toast. */
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { C, R, font } from '../theme/tokens';
import { Icon } from '../icons/Icon';
import { Button, IconButton, TextField, Toast, Txt } from './ds';
import { FooterBar, Grabber, Sheet, useFooterPad, useNavBottom, useSheetDrag } from './overlay';
import { SheetHeader } from './vault';

// ─── Option picker (the prototype's z-70 picker sheet) ──

function PickerHead({ title, onClose }: { title: string; onClose: () => void }) {
  const drag = useSheetDrag();
  return (
    <View {...drag.panHandlers}>
      <Grabber color={C.n200} />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 6, paddingHorizontal: 8, paddingBottom: 10 }}>
        <View style={{ width: 44 }} />
        <Txt style={[font(600, 15, 20), { flex: 1, textAlign: 'center' }]} lines={1}>{title}</Txt>
        <View style={{ width: 44, alignItems: 'center' }}><IconButton icon="x" label="Close" onPress={onClose} /></View>
      </View>
    </View>
  );
}

export function PickerHost() {
  const picker = useStore((s) => s.picker);
  const set = useStore((s) => s.set);
  const [q, setQ] = useState('');
  const pb = useFooterPad(34);
  const { height } = useWindowDimensions();
  useEffect(() => setQ(''), [picker]);
  if (!picker) return null;
  const close = () => set({ picker: null });
  const qq = q.trim().toLowerCase();
  const opts = picker.opts.filter((x) => !qq || `${x.label} ${x.sub ?? ''}`.toLowerCase().includes(qq));
  return (
    <Sheet onClose={close} z={70} form={false} header={<PickerHead title={picker.title} onClose={close} />} bodyStyle={{ paddingTop: 0, paddingBottom: pb, gap: 0 }} maxHeight={height * 0.82}>
      {picker.opts.length > 5 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingLeft: 20, paddingRight: 16, borderRadius: 999, backgroundColor: '#F2F4F7', marginBottom: 12 }}>
          <TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={C.n500} autoCorrect={false} style={[font(400, 14, 20), { flex: 1, color: C.text, padding: 0 }]} />
          <Icon name="search" size={20} color={C.n500} />
        </View>
      ) : null}
      <View style={{ borderWidth: 1, borderColor: C.borderSubtle, borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff' }}>
        {opts.map((x, i) => {
          const sel = x.v === picker.cur;
          return (
            <Pressable
              key={String(x.v) + i}
              onPress={() => { close(); picker.onPick(x.v); }}
              style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: pressed ? C.n50 : sel ? C.primary25 : 'transparent', borderBottomWidth: i < opts.length - 1 ? 1 : 0, borderBottomColor: C.borderSubtle }]}
            >
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Txt style={[font(sel ? 500 : 400, 14, 20), { color: sel ? C.primary600 : C.text }]}>{x.label}</Txt>
                {x.sub ? <Txt style={[font(400, 12, 16), { color: C.text2 }]}>{x.sub}</Txt> : null}
              </View>
              <View style={{ width: 20, opacity: sel ? 1 : 0 }}><Icon name="check" size={20} color={C.primary500} /></View>
            </Pressable>
          );
        })}
      </View>
      {qq && !opts.length ? <Txt style={[font(400, 12, 17), { color: C.text2, textAlign: 'center', paddingVertical: 24 }]}>No matches</Txt> : null}
    </Sheet>
  );
}

// ─── Barcode / QR scanner with manual entry ─────────────

export function ScanHost() {
  const scan = useStore((s) => s.scan);
  const set = useStore((s) => s.set);
  const [perm, requestPerm] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const [torch, setTorch] = useState(false);
  const done = useRef(false);
  useEffect(() => { done.current = false; setManual(''); setTorch(false); }, [scan]);
  if (!scan) return null;
  const close = () => set({ scan: null });
  const finish = (code: string) => {
    if (done.current || !code.trim()) return;
    done.current = true;
    close();
    scan.onCode(code.trim().toUpperCase());
  };
  return (
    <Sheet
      onClose={close}
      z={75}
      header={<SheetHeader title={scan.title} subtitle={scan.hint ?? 'Point the camera at the barcode or QR label'} icon="scan-barcode" onClose={close} />}
      bodyBg={C.bgApp}
      footer={
        <FooterBar base={34} style={{ paddingTop: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: C.hairline, backgroundColor: '#fff', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <TextField label="Or type the code" placeholder={scan.example ? `E.g. ${scan.example}` : 'Type the code'} value={manual} onChangeText={setManual} autoCapitalize="characters" style={{ flex: 1 }} />
            <Button size="lg" disabled={!manual.trim()} onPress={() => finish(manual)}>Use</Button>
          </View>
        </FooterBar>
      }
    >
      <View style={{ height: 300, borderRadius: R.card, overflow: 'hidden', backgroundColor: '#0C0E12', alignItems: 'center', justifyContent: 'center' }}>
        {perm?.granted ? (
          <>
            <CameraView
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'code93', 'ean13', 'ean8', 'upc_a', 'upc_e', 'datamatrix', 'pdf417', 'itf14', 'codabar'] }}
              onBarcodeScanned={(r) => finish(r.data)}
            />
            <View pointerEvents="none" style={{ width: 240, height: 140, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' }} />
            <View style={{ position: 'absolute', right: 12, bottom: 12 }}>
              <Pressable onPress={() => setTorch((t) => !t)} accessibilityLabel="Torch" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: torch ? '#fff' : 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="flashlight" size={20} color={torch ? C.text : '#fff'} />
              </Pressable>
            </View>
          </>
        ) : (
          <View style={{ alignItems: 'center', gap: 12, padding: 24 }}>
            <Icon name="camera" size={32} color="#fff" />
            <Txt style={[font(400, 13, 18), { color: 'rgba(255,255,255,0.75)', textAlign: 'center' }]}>
              {perm && !perm.canAskAgain ? 'Camera access is off. Enable it in Settings, or type the code below.' : 'Allow camera access to scan labels.'}
            </Txt>
            {!perm || perm.canAskAgain ? <Button variant="secondary" onPress={requestPerm}>Allow camera</Button> : null}
          </View>
        )}
      </View>
    </Sheet>
  );
}

// ─── Date / date-time picker ────────────────────────────

export function DateHost() {
  const req = useStore((s) => s.date);
  const set = useStore((s) => s.set);
  const [val, setVal] = useState(new Date());
  const pb = useFooterPad(34);

  useEffect(() => {
    if (!req) return;
    setVal(req.value);
    if (Platform.OS !== 'android') return;
    set({ date: null });
    DateTimePickerAndroid.open({
      value: req.value, mode: 'date',
      onValueChange: (_e, d) => {
        if (req.mode === 'date') return req.onPick(d);
        DateTimePickerAndroid.open({ value: d, mode: 'time', is24Hour: true, onValueChange: (_e2, t) => req.onPick(new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.getHours(), t.getMinutes())) });
      },
    });
  }, [req, set]);

  if (!req || Platform.OS === 'android') return null;
  const close = () => set({ date: null });
  return (
    <Sheet
      onClose={close}
      z={72}
      scroll={false}
      header={<SheetHeader title={req.title} icon="calendar" onClose={close} />}
      footer={
        <View style={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: pb, borderTopWidth: 1, borderTopColor: C.hairline }}>
          <Button size="lg" fullWidth onPress={() => { close(); req.onPick(val); }}>Done</Button>
        </View>
      }
    >
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 8 }}>
        <DateTimePicker value={val} mode={req.mode} display={req.mode === 'date' ? 'inline' : 'spinner'} accentColor={C.primary500} themeVariant="light" onValueChange={(_e, d) => setVal(d)} />
      </ScrollView>
    </Sheet>
  );
}

// ─── Toast ──────────────────────────────────────────────

export function ToastHost() {
  const toast = useStore((s) => s.toast);
  const navBottom = useNavBottom();
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: navBottom + 86, zIndex: 80, elevation: 80 }}>
      <Toast key={toast.id} message={toast.msg} tone={toast.tone} />
    </View>
  );
}
