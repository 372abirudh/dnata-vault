// Generates the app icon, Android adaptive icon layers, splash image and favicon from the dnata logo.
// Run: node scripts/gen-brand.js   (needs the sharp dev dependency)
const path = require('path');
const sharp = require('sharp');

const out = (f) => path.join(__dirname, '..', 'assets', f);

// dnata wordmark (assets/dnata-logo.svg from the design, metadata removed). viewBox 0 0 36.353042 10.078157.
const LOGO_W = 36.353042, LOGO_H = 10.078157;
const logo = (accent, word) => `<g transform="translate(-127.09863,-178.43577)">
<path transform="matrix(0.35277777,0,0,-0.35277777,134.72434,180.91895)" fill="${accent}" d="M 0,0 V -3.854 L 4.351,0 Z"/>
<path transform="matrix(0.35277777,0,0,-0.35277777,-249.03949,199.26384) translate(1084.1063,52.003204)" fill="${word}" d="m 0,0 h -7.445 c -5.081,0 -10.068,-3.852 -10.068,-10.424 0,-6.27 4.82,-10.732 10.642,-10.732 6.352,0 10.599,5.074 10.599,10.91 v 6.124 H 0 v -6.125 c 0,-3.309 -2.403,-7.356 -6.865,-7.356 -3.78,0 -6.871,3.22 -6.878,7.179 0,2.86 1.989,6.917 7.226,6.917 h 6.285 L 3.728,0 V 6.662 H 0 Z m 19.401,0.731 c -3.454,0 -6.7,-1.944 -7.737,-3.887 v 3.154 H 8.079 v -20.646 h 3.974 v 12.787 c 0,3.656 3.963,5.482 6.467,5.482 4.31,0 5.192,-2.85 5.192,-6.219 v -12.05 h 3.798 v 12.483 c 0,7.17 -3.995,8.896 -8.109,8.896 m 40.128,-18.409 c -1.832,0 -2.354,1.448 -2.354,2.927 v 11.366 h 6.303 v 3.387 h -6.303 v 6.66 h -3.749 v -22.175 c -0.002,-2.102 1.018,-5.643 5.568,-5.643 1.696,0 3.531,0.338 4.707,0.873 l -1.059,3.341 c -1.405,-0.561 -2.408,-0.736 -3.113,-0.736 M 84.783,-6.26 c 0,3.019 -2.534,6.682 -9.63,6.682 h -0.002 c -0.002,0 -0.006,0.001 -0.012,0 -4.286,0 -8.241,-2.305 -8.241,-2.305 l 1.603,-2.74 c 0,0 2.686,1.769 6.62,1.769 5.516,0 6,-2.523 6.011,-3.705 v -0.313 c 0,0 -4.193,-0.364 -6.673,-0.595 -3.561,-0.328 -5.837,-1.411 -7.223,-2.755 -1.388,-1.342 -1.892,-2.948 -1.892,-4.335 v -0.046 c 0,-4.333 4.175,-6.547 8.82,-6.547 3.632,0 7.092,1.844 7.092,1.844 v -1.35 h 3.529 z M 73.957,-18.024 c -1.408,0 -4.727,0.562 -4.727,3.894 0,2.486 2.994,3.496 5.476,3.714 1.742,0.153 6.452,0.549 6.452,0.549 0,0 0.001,-5.006 0.001,-5.439 -1.273,-1.767 -4.237,-2.718 -7.202,-2.718 M 49.769,-6.26 c 0,3.538 -3.109,6.682 -9.644,6.682 -4.156,0 -8.241,-2.305 -8.241,-2.305 l 1.603,-2.74 c 0,0 2.685,1.769 6.62,1.769 5.515,0 5.999,-2.523 6.01,-3.705 v -0.313 c 0,0 -4.192,-0.372 -6.673,-0.595 -3.981,-0.357 -9.114,-2.185 -9.114,-7.136 0,-4.314 4.175,-6.547 8.819,-6.547 3.632,0 7.093,1.844 7.093,1.844 v -1.35 H 49.77 Z M 38.942,-18.024 c -1.408,0 -4.726,0.562 -4.726,3.894 0,2.486 2.994,3.496 5.475,3.714 1.742,0.153 6.452,0.549 6.452,0.549 0,0 0.002,-5.006 0.002,-5.439 -1.273,-1.767 -4.238,-2.718 -7.203,-2.718"/>
</g>`;

/** Logo centred in a size×size square, `widthFrac` of the square wide. */
const placed = (size, widthFrac, accent, word, dy = 0) => {
  const w = size * widthFrac, s = w / LOGO_W, h = LOGO_H * s;
  return `<g transform="translate(${(size - w) / 2},${(size - h) / 2 + dy}) scale(${s})">${logo(accent, word)}</g>`;
};

// Navy-to-blue background echoing the app's hero art.
const background = (size) => `
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#061C6E"/><stop offset="0.55" stop-color="#0A3FC4"/><stop offset="1" stop-color="#0A57F2"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.85" cy="0.1" r="0.8">
    <stop offset="0" stop-color="#2E7BFF" stop-opacity="0.7"/><stop offset="1" stop-color="#2E7BFF" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="${size}" height="${size}" fill="#0A1B4F"/>
<rect width="${size}" height="${size}" fill="url(#bg)"/>
<rect width="${size}" height="${size}" fill="url(#glow)"/>
<path d="M ${size * 0.2} ${-size * 0.05} C ${size * 0.3} ${size * 0.35}, ${size * 0.55} ${size * 0.6}, ${size * 1.05} ${size * 0.75}" stroke="#7EB0FF" stroke-opacity="0.55" stroke-width="${size * 0.004}" fill="none"/>`;

const svg = (size, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`);
const png = (size, body, file) => sharp(svg(size, body)).png().toFile(out(file)).then(() => console.log('wrote', file));

// Square crop of the app's hero artwork (assets/hero-bg.jpg), slightly darkened so the wordmark reads well.
const heroSquare = (size) =>
  sharp(out('hero-bg.jpg')).resize(size, size, { fit: 'cover', position: 'centre' }).modulate({ brightness: 0.9 }).toBuffer();

(async () => {
  const S = 1024, WHITE = '#FFFFFF', GREEN = '#80BA51';
  const hero = await heroSquare(S);
  // iOS / store icon: hero artwork + white wordmark with the green accent.
  await sharp(hero).composite([{ input: svg(S, placed(S, 0.72, GREEN, WHITE)) }]).png().toFile(out('icon.png'));
  console.log('wrote icon.png');
  // Android adaptive icon: the launcher crops to the centre ~66%, so the logo stays inside that.
  await sharp(hero).png().toFile(out('android-icon-background.png'));
  console.log('wrote android-icon-background.png');
  await png(S, placed(S, 0.5, GREEN, WHITE), 'android-icon-foreground.png');
  await png(S, placed(S, 0.5, WHITE, WHITE), 'android-icon-monochrome.png');
  // Splash: brand-coloured wordmark on a transparent canvas (background colour set in app.json).
  await png(S, placed(S, 0.92, GREEN, WHITE), 'splash-icon.png');
  await png(48, background(48) + placed(48, 0.8, GREEN, WHITE), 'favicon.png');
})();
