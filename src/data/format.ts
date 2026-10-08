export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const p2 = (n: number) => String(n).padStart(2, '0');
export const hm = (d: Date) => `${p2(d.getHours())}:${p2(d.getMinutes())}`;
/** "7 Oct 2026" */
export const dateLong = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
/** "7 Oct · 14:05" — order history timestamps. */
export const nowShort = () => { const d = new Date(); return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${hm(d)}`; };
/** "7 Oct 2026 · 14:05" — receipt history timestamps. */
export const nowLong = () => { const d = new Date(); return `${dateLong(d)} · ${hm(d)}`; };
/** "2026-10-07" */
export const iso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const fromIso = (s: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
/** "Today is Wednesday · 7 Oct 2026" */
export const todayLine = () => { const d = new Date(); return `Today is ${DAYS[d.getDay()]} · ${dateLong(d)}`; };

export const plural = (n: number, one: string, many?: string) => `${n} ${n === 1 ? one : many ?? one + 's'}`;
export const initials = (name: string) => name.split(' ').filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase() || '—';
export const aed = (n: number) => 'AED ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** "AED 3.6M" / "AED 980K" — order values on cards and documents. */
export const aedShort = (n: number) => (n >= 1e6 ? 'AED ' + (n / 1e6).toFixed(1) + 'M' : 'AED ' + Math.round(n / 1000) + 'K');
/** Strips " Logistics Vault" / " Vault" etc. — "DXB Vault North" → "DXB North". */
export const shortFac = (f: string) => String(f || '').replace(' Logistics Vault', '').replace(' Vault', '').replace(' Logistics', '');
