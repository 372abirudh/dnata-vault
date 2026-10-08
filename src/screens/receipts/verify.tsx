import React, { useState } from 'react';
import { View } from 'react-native';
import { useStore, newVerifyDraft, lineReceived, VerifyDraft, VerifyLine } from '../../store';
import { C, font, mono, tabular } from '../../theme/tokens';
import { Icon } from '../../icons/Icon';
import { Button, Card, Checkbox, Chip, IconButton, InfoGrid, MetricCard, SegmentedControl, StatusChip, TextField, Txt } from '../../components/ds';
import { FooterBar, Grabber, Sheet, useSheetDrag } from '../../components/overlay';
import { Barcode } from '../../components/art';
import { ORIGINS, PACKS, SUPPLIERS } from '../../data/seed';
import { dateLong, hm } from '../../data/format';
import { sumExp, varianceTone } from '../../logic/grn';
import { grnDocHtml, printHtml } from '../../logic/docs';

const TITLES = ['Handover', 'Items received', 'Packages & seals', 'Print labels'];
const SUBS = [
  'Who delivered, and when it arrived at the gate.',
  'Count against the PO — by piece or by package.',
  'Lot, weight, seal and bar numbers per package.',
  'One label per package, sent to the vault printer.',
];
const varOf = (exp: number, r: number) => (r === 0 ? 'Awaiting' : r === exp ? 'Complete' : r > exp ? `Over +${r - exp}` : `Short −${exp - r}`);

function gateOf(step: number, vf: VerifyDraft) {
  if (step === 1) {
    if (!vf.supplier) return 'Select the supplier that delivered the consignment.';
    if (!vf.driver.trim()) return 'Driver name is required.';
    if (!vf.mobile.trim()) return 'Driver mobile is required.';
    if (!vf.vehicle.trim()) return 'Vehicle number is required.';
  }
  if (step === 2) {
    for (const l of vf.lines) {
      if (l.mode === 'package' && !l.packType) return 'Every package-mode line needs a package type.';
      if (lineReceived(l) <= 0) return 'Every line needs a received quantity above zero.';
    }
  }
  if (step === 3) {
    for (const l of vf.lines) {
      if (!l.lot.trim()) return 'Lot number is required on every package.';
      if (!l.weight.trim()) return 'Weight is required on every package.';
      if (!l.seal.trim()) return 'Seal ID must be captured on every package.';
    }
  }
  if (step === 4 && !vf.lines.some((l) => l.label)) return 'Select at least one label to print.';
  return null;
}

function VerifyHead({ title, caption, sub, step, onClose }: { title: string; caption: string; sub: string; step: number; onClose: () => void }) {
  const drag = useSheetDrag();
  return (
    <View {...drag.panHandlers} style={{ backgroundColor: C.bgApp }}>
      <Grabber />
      <View style={{ paddingTop: 4, paddingBottom: 12, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 16 }}>
          <View style={{ flex: 1, gap: 4, paddingTop: 4 }}>
            <Txt style={font(700, 16, 22)} lines={1}>{title}</Txt>
            <Txt style={[font(400, 12, 16), { color: C.text2 }]} lines={1}>{caption}</Txt>
          </View>
          <IconButton icon="x" label="Close" onPress={onClose} />
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
          <Txt style={[font(400, 12, 17), { color: C.text2 }]}>{sub}</Txt>
          <View style={{ marginTop: 12, flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4].map((n) => <View key={n} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: n <= step ? C.primary500 : C.n150 }} />)}
          </View>
        </View>
      </View>
    </View>
  );
}

export function VerifySheet() {
  const s = useStore();
  const g = s.grns.find((x) => x.no === s.sheetNo)!;
  const [vf, setVf] = useState<VerifyDraft>(() => newVerifyDraft(g));
  const [step, setStep] = useState(1);
  const close = () => s.set({ grnSheet: null });
  const up = (p: Partial<VerifyDraft>) => setVf((x) => ({ ...x, ...p }));
  const upLine = (i: number, p: Partial<VerifyLine>) => setVf((x) => ({ ...x, lines: x.lines.map((l, j) => (j === i ? { ...l, ...p } : l)) }));
  const gate = gateOf(step, vf);

  const next = () => {
    if (gate) return;
    if (step < 4) return setStep(step + 1);
    const msg = s.verifyGrn(g.no, vf);
    const printed = vf.lines.map((l, i) => (l.label ? i : -1)).filter((i) => i >= 0);
    close();
    s.flash(msg);
    if (printed.length) {
      const fresh = useStore.getState().grns.find((x) => x.no === g.no)!;
      printHtml(grnDocHtml({ ...fresh, lines: fresh.lines.filter((_, i) => printed.includes(i)) }, 'labels')).catch(() => {});
    }
  };

  const genBars = (i: number) => {
    const l = vf.lines[i];
    const p = (l.barPrefix || 'BAR').replace(/-+$/, '');
    const f = parseInt(l.barFrom, 10), t = parseInt(l.barTo, 10);
    const add: string[] = [];
    if (!isNaN(f)) for (let n = f; n <= (isNaN(t) ? f : t) && add.length < 100; n++) add.push(`${p}-${String(n).padStart(4, '0')}`);
    else add.push(`${p}-${String(l.bars.length + 1).padStart(4, '0')}`);
    upLine(i, { bars: [...l.bars, ...add.filter((x) => !l.bars.includes(x))] });
  };

  const exp = sumExp(g), rec = vf.lines.reduce((a, l) => a + lineReceived(l), 0), diff = rec - exp;

  return (
    <Sheet
      onClose={close} z={40} bg={C.bgApp} form={false} page={step}
      header={<VerifyHead title={TITLES[step - 1]} caption={`${g.no} · Step ${step} of 4`} sub={SUBS[step - 1]} step={step} onClose={close} />}
      bodyStyle={{ paddingTop: 16 }}
      footer={
        <FooterBar base={34} style={{ paddingTop: 12, paddingHorizontal: 16, backgroundColor: C.bgApp, gap: 12 }}>
          {gate ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
              <Icon name="circle-alert" size={16} color={C.warningIcon} />
              <Txt style={[font(400, 12, 16), { flex: 1, color: C.warningText }]}>{gate}</Txt>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {step > 1 ? <Button variant="tertiary" size="lg" style={{ width: 112 }} onPress={() => setStep(step - 1)}>Back</Button> : null}
            <View style={{ flex: 1 }}>
              <Button size="lg" fullWidth disabled={!!gate} trailingIcon={step === 4 ? 'printer' : 'chevron-right'} onPress={next}>
                {step === 4 ? 'Print and finish' : 'Continue'}
              </Button>
            </View>
          </View>
        </FooterBar>
      }
    >
      {step === 1 ? (
        <Card>
          <View style={{ gap: 16 }}>
            <TextField label="Supplier" required placeholder="Select supplier" value={vf.supplier} readOnly leadingIcon="building" trailingIcon="chevron-down"
              onPress={() => s.openPicker('Supplier', SUPPLIERS.map((v) => ({ v, label: v })), vf.supplier, (v) => up({ supplier: v }))} />
            <TextField label="Driver name" required placeholder="Full name as on gate pass" value={vf.driver} onChangeText={(v) => up({ driver: v })} leadingIcon="id-card" autoCapitalize="words" />
            <TextField label="Driver mobile" required leadingIcon="phone" prefix={vf.cc} placeholder="50 123 4567" keyboardType="phone-pad" value={vf.mobile} onChangeText={(v) => up({ mobile: v })} />
            <TextField label="Vehicle number" required placeholder="DXB A 41827" value={vf.vehicle} onChangeText={(v) => up({ vehicle: v.toUpperCase() })} leadingIcon="truck" autoCapitalize="characters" />
            <TextField label="Arrived" required leadingIcon="clock" readOnly value={`${dateLong(vf.arrived)} · ${hm(vf.arrived)}`} trailingIcon="calendar"
              onPress={() => s.openDate('Arrived', 'datetime', vf.arrived, (d) => up({ arrived: d }))} />
          </View>
        </Card>
      ) : null}

      {step === 2 ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <MetricCard label="Expected" value={String(exp)} />
            <MetricCard label="Received" value={String(rec)} />
            <MetricCard label="Variance" value={diff === 0 ? '0' : diff > 0 ? `+${diff}` : `−${-diff}`} delta={rec === 0 ? undefined : diff === 0 ? 'Matched' : diff > 0 ? 'Over' : 'Short'} deltaTone={diff === 0 ? 'success' : 'error'} />
          </View>
          {vf.lines.map((l, i) => {
            const src = g.lines[i], v = varOf(src.exp, lineReceived(l));
            return (
              <Card key={i}>
                <View style={{ gap: 14 }}>
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt style={[mono(12, 16, 400), { color: C.text2 }]}>{src.code}</Txt>
                      <Txt style={[font(600, 14, 20), { marginTop: 2 }]}>{src.name}</Txt>
                      <Txt style={[font(400, 12, 16), { color: C.text2, marginTop: 4 }]}>Expected {src.exp} {src.pack}</Txt>
                    </View>
                    <StatusChip tone={varianceTone(v)} label={v} size="sm" />
                  </View>
                  <SegmentedControl items={[{ key: 'individual', label: 'Individual' }, { key: 'package', label: 'Package' }]} active={l.mode} onChange={(k) => upLine(i, { mode: k as never })} />
                  {l.mode === 'individual' ? (
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                      <View style={{ flex: 1 }}><TextField leadingIcon="box" label="Pieces received" keyboardType="number-pad" placeholder="0" value={l.pieces} onChangeText={(x) => upLine(i, { pieces: x.replace(/[^0-9]/g, '') })} /></View>
                      <Button variant="secondary" size="lg" style={{ width: 110 }} onPress={() => upLine(i, { pieces: String(src.exp) })}>{`Match ${src.exp}`}</Button>
                    </View>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={{ width: 100 }}><TextField leadingIcon="package" label="Packages" keyboardType="number-pad" placeholder="0" value={l.packages} onChangeText={(x) => upLine(i, { packages: x.replace(/[^0-9]/g, '') })} /></View>
                        <View style={{ flex: 1 }}>
                          <TextField leadingIcon="package" label="Package type" placeholder="Select" value={l.packType} readOnly trailingIcon="chevron-down"
                            onPress={() => s.openPicker('Package type', Object.entries(PACKS).map(([k, n]) => ({ v: k, label: k, sub: `${n} pieces per package` })), l.packType, (v) => upLine(i, { packType: v }))} />
                        </View>
                      </View>
                      <Txt style={[font(400, 12, 16), { color: C.text2 }]}>
                        {l.packType ? `${l.packages || 0} × ${PACKS[l.packType]} = ${lineReceived(l)} pieces` : 'Choose a package type to multiply the count.'}
                      </Txt>
                    </>
                  )}
                </View>
              </Card>
            );
          })}
        </>
      ) : null}

      {step === 3
        ? vf.lines.map((l, i) => {
            const src = g.lines[i];
            return (
              <Card key={i}>
                <View style={{ gap: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <Txt style={[font(600, 14, 20), { flex: 1 }]}>{src.name}</Txt>
                    <Txt style={[mono(12, 16, 400), { color: C.text2 }]}>{src.pkgId}</Txt>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}><TextField leadingIcon="tag" label="Lot number" required placeholder="LOT-0000" value={l.lot} onChangeText={(x) => upLine(i, { lot: x.toUpperCase() })} autoCapitalize="characters" /></View>
                    <View style={{ width: 144 }}><TextField leadingIcon="weight" label="Weight" required suffix="kg" placeholder="0.000" keyboardType="decimal-pad" value={l.weight} onChangeText={(x) => upLine(i, { weight: x.replace(/[^0-9.]/g, '') })} /></View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['l', 'w', 'h'] as const).map((k) => (
                      <View key={k} style={{ flex: 1 }}>
                        <TextField leadingIcon="ruler" label={{ l: 'Length', w: 'Width', h: 'Height' }[k]} suffix="cm" keyboardType="decimal-pad" value={l[k]} onChangeText={(x) => upLine(i, { [k]: x.replace(/[^0-9.]/g, '') })} />
                      </View>
                    ))}
                  </View>
                  <TextField label="Country of origin" placeholder="Select country" value={l.origin} readOnly leadingIcon="globe" trailingIcon="chevron-down"
                    onPress={() => s.openPicker('Country of origin', ORIGINS.map((v) => ({ v, label: v })), l.origin, (v) => upLine(i, { origin: v }))} />
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                    <View style={{ flex: 1 }}><TextField leadingIcon="lock" label="Seal ID" required placeholder="Scan or type seal" value={l.seal} onChangeText={(x) => upLine(i, { seal: x.toUpperCase() })} success={!!l.seal} autoCapitalize="characters" /></View>
                    <Button variant="secondary" size="lg" leadingIcon="scan-barcode" style={{ width: 104 }}
                      onPress={() => s.openScan('Scan seal', (code) => { upLine(i, { seal: code }); s.flash('Seal scanned.'); }, src.pkgId, 'SL-771600')}>Scan</Button>
                  </View>
                  <View style={{ paddingTop: 14, borderTopWidth: 1, borderTopColor: C.borderSubtle, gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Txt style={[font(500, 12, 16), { color: C.n700 }]}>Bar numbers</Txt>
                      <Txt style={[font(400, 12, 16), { color: C.text2 }]}>{l.bars.length} {l.bars.length === 1 ? 'bar' : 'bars'}</Txt>
                    </View>
                    <TextField placeholder="Prefix (e.g. ENT-)" value={l.barPrefix} onChangeText={(x) => upLine(i, { barPrefix: x.toUpperCase() })} autoCapitalize="characters" />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}><TextField keyboardType="number-pad" placeholder="From" value={l.barFrom} onChangeText={(x) => upLine(i, { barFrom: x.replace(/[^0-9]/g, '') })} /></View>
                      <View style={{ flex: 1 }}><TextField keyboardType="number-pad" placeholder="To" value={l.barTo} onChangeText={(x) => upLine(i, { barTo: x.replace(/[^0-9]/g, '') })} /></View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}><Button variant="secondary" size="md" fullWidth leadingIcon="plus" onPress={() => genBars(i)}>Add bar range</Button></View>
                      <Button variant="secondary" size="md" leadingIcon="barcode"
                        onPress={() => s.openScan('Scan bar number', (code) => setVf((x) => ({
                          ...x, lines: x.lines.map((ln, j) => (j === i && !ln.bars.includes(code) ? { ...ln, bars: [...ln.bars, code] } : ln)),
                        })), undefined, 'CH-1001')}>Scan</Button>
                    </View>
                    {l.bars.length ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {l.bars.map((b) => <Chip key={b} label={b} size="sm" removable onRemove={() => upLine(i, { bars: l.bars.filter((x) => x !== b) })} />)}
                      </View>
                    ) : (
                      <Txt style={[font(400, 12, 16), { color: C.text2 }]}>No bar numbers captured.</Txt>
                    )}
                  </View>
                </View>
              </Card>
            );
          })
        : null}

      {step === 4
        ? vf.lines.map((l, i) => (
            <Card key={i} variant={l.label ? 'selected' : 'default'} onPress={() => upLine(i, { label: !l.label })}>
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Txt style={[font(400, 12, 16), { color: C.text2 }]}>Package label</Txt>
                    <Txt style={[font(600, 14, 20), { marginTop: 2 }]}>{g.lines[i].name}</Txt>
                  </View>
                  <Checkbox checked={l.label} onChange={() => upLine(i, { label: !l.label })} />
                </View>
                <View style={{ borderRadius: 4, overflow: 'hidden' }}><Barcode height={44} /></View>
                <Txt style={[mono(12, 16, 400), tabular, { letterSpacing: 1.4, textAlign: 'center' }]}>{g.lines[i].pkgId}</Txt>
                <InfoGrid columns={3} dense items={[
                  { label: 'Lot', value: l.lot || '—' }, { label: 'Weight', value: l.weight ? `${l.weight} kg` : '—' }, { label: 'Seal', value: l.seal || '—' },
                ]} />
              </View>
            </Card>
          ))
        : null}
    </Sheet>
  );
}
