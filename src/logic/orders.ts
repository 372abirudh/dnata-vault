import type { Order, OrderStatus } from '../data/types';
import type { Tone } from '../theme/tokens';
import { byCode } from '../data/seed';
import { aedShort } from '../data/format';

export const ORDER_FLOW: OrderStatus[] = ['Pending', 'Allocated', 'Picked', 'Ready for dispatch', 'Dispatched', 'Delivered'];
export const ORDER_TABS = ['All', 'Pending', 'Allocated', 'Picked', 'Ready for dispatch', 'Dispatched', 'Delivered', 'Cancelled'] as const;
export const ORDER_TAB_ICON: Record<string, string> = {
  Pending: 'clock', Allocated: 'user-check', Picked: 'scan-barcode', 'Ready for dispatch': 'package-check', Dispatched: 'truck',
  Delivered: 'circle-check', Cancelled: 'circle-x', All: 'layout-grid',
};

// 'primary' renders as a neutral StatusChip, exactly as in the prototype's design system.
export const orderTone = (s: OrderStatus): Tone =>
  ({ Pending: 'warning', Allocated: 'primary', Picked: 'info', 'Ready for dispatch': 'primary', Dispatched: 'primary', Delivered: 'success', Cancelled: 'error' } as Record<string, Tone>)[s];

export type OrderAction = 'approve' | 'pick' | 'dispatch' | 'deliver';
export const orderNextAct = (s: OrderStatus): OrderAction | null =>
  (({ Pending: 'approve', Allocated: 'pick', Picked: 'pick', 'Ready for dispatch': 'dispatch', Dispatched: 'deliver' } as Record<string, OrderAction>)[s] ?? null);
export const orderActText = (a: OrderAction, s: OrderStatus) =>
  ({ approve: 'Allocate', pick: s === 'Picked' ? 'Pack' : 'Pick bars', dispatch: 'Dispatch', deliver: 'Capture POD' })[a];
export const orderActIcon = (a: OrderAction, s?: OrderStatus) =>
  ({ approve: 'user-check', pick: s === 'Picked' ? 'package' : 'scan-barcode', dispatch: 'truck', deliver: 'id-card' })[a];

export const orderPrompt = (s: OrderStatus) =>
  (({
    Pending: 'Allocate vault stock to this order so it can be picked.', Allocated: 'Pick every line from its bin.',
    Picked: 'All lines picked. Pack and seal the consignment.', 'Ready for dispatch': 'Hand the sealed consignment to the carrier.',
    Dispatched: 'Confirm once the receiver signs for delivery.', Delivered: 'Order complete. The record is locked.',
  } as Record<string, string>)[s] ?? '');

export const recipientOf = (o: Order) => o.extra?.recipient || '—';
export const deliveryOf = (o: Order) => { const m = o.extra?.method; return m === 'Armoured vehicle' || !m ? 'VIT armored' : m; };
export const createdOf = (o: Order) => o.history[0]?.ts ?? o.release;
/** Declared value: the sum of the line values, so it always matches the items. Falls back to the stored figure for items without a catalogue price. */
export const valueOf = (o: Order) => {
  let t = 0;
  for (const it of o.items) { const c = byCode(it.code); if (!c) return o.value; t += c.price * it.qty; }
  return aedShort(t);
};
