import type { Grn, GrnLine, GrnStatus } from '../data/types';
import type { Tone } from '../theme/tokens';

export const GRN_FLOW: GrnStatus[] = ['Draft', 'Staff Assigned', 'Verified GRN', 'Signed', 'Put Away Raised', 'Closed'];

export type GrnAction = 'Assign staff' | 'Verify' | 'Sign VHR' | 'Put away' | 'Close GRN';
export const grnNextAct = (s: GrnStatus): GrnAction | null =>
  (({ Draft: 'Assign staff', 'Staff Assigned': 'Verify', 'Verified GRN': 'Sign VHR', Signed: 'Put away', 'Put Away Raised': 'Close GRN' } as Record<string, GrnAction>)[s] ?? null);

export const grnActIcon = (a: GrnAction) =>
  ({ 'Assign staff': 'user-check', Verify: 'clipboard-check', 'Sign VHR': 'signature', 'Put away': 'warehouse', 'Close GRN': 'lock' })[a];

export const grnLabel = (s: GrnStatus) =>
  (({ 'Staff Assigned': 'Staff assigned', 'Verified GRN': 'Verified', 'Put Away Raised': 'Put away raised' } as Record<string, string>)[s] ?? s);

export const grnTone = (s: GrnStatus): Tone =>
  (({ 'Staff Assigned': 'info', 'Verified GRN': 'success', Signed: 'accent', 'Put Away Raised': 'warning' } as Record<string, Tone>)[s] ?? 'neutral');

export const grnPrompt = (s: GrnStatus) =>
  ({
    Draft: 'Assign an intake officer to take ownership of this receipt.',
    'Staff Assigned': 'Verify the goods against the PO — handover, counts, packages, labels.',
    'Verified GRN': 'Sign the valuable handling receipt to accept custody.',
    Signed: 'Allocate every package to an account, vault and bin. The GRN closes automatically once put away is updated.',
    'Put Away Raised': 'All packages are binned. Close the GRN to lock the record.',
    Closed: 'Terminal state. Documents and exports remain available.',
  })[s] ?? '';

export const grnEventIcon = (k?: string) =>
  ({ create: 'file-text', assign: 'user-check', verify: 'clipboard-check', sign: 'signature', putaway: 'warehouse', close: 'lock' } as Record<string, string>)[k ?? ''] ?? 'circle-check';

export const sumExp = (g: Grn) => g.lines.reduce((a, l) => a + l.exp, 0);
export const sumRec = (g: Grn) => g.lines.reduce((a, l) => a + (l.received ?? 0), 0);
export const sealedCount = (g: Grn) => g.lines.filter((l) => l.seal).length;

export const variance = (l: Pick<GrnLine, 'exp' | 'received'>) => {
  const r = l.received;
  if (r == null) return 'Awaiting';
  if (r === l.exp) return 'Complete';
  return r > l.exp ? `Over +${r - l.exp}` : `Short −${l.exp - r}`;
};
export const varianceTone = (v: string): Tone => (v === 'Awaiting' ? 'neutral' : v === 'Complete' ? 'success' : 'warning');

export const GRN_TABS: { key: string; icon: string }[] = [
  { key: 'All', icon: 'layout-grid' },
  { key: 'Draft', icon: 'sticky-note' },
  { key: 'Staff Assigned', icon: 'user-check' },
  { key: 'Verified GRN', icon: 'badge-check' },
  { key: 'Signed', icon: 'signature' },
];
