// Original vector packaging concepts. No third-party assets or build dependencies.
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const assets = fileURLToPath(new URL('../assets/', import.meta.url));
await mkdir(assets, { recursive: true });
const products = [
  { id: 'chicken', label: '鸡胸肉小方块', en: 'CHICKEN BITES', accent: '#7f966e', pale: '#d8e1c9', rotation: -6, pet: 'FOR YOUR DOG', drawing: '<path d="M-22 10c-8-4-8-18 0-23l25-9c13-4 27 8 22 21S3 21-8 22L-22 10Z"/><path d="m-20 11-16 14m-2-6c-8-4-10 6-4 9-1 7 9 8 10 1"/>' },
  { id: 'salmon', label: '三文鱼小酥粒', en: 'SALMON CRUNCH', accent: '#c78e77', pale: '#efd6c6', rotation: 5, pet: 'FOR YOUR CAT', drawing: '<path d="M-30 0C-13-24 16-24 29 0 16 24-13 24-30 0Zm0 0-17-15v30l17-15Z"/><path d="M3-17c-6 10-6 24 0 34M13-14c-6 8-6 20 0 28"/><circle cx="19" cy="-4" r="1.5" fill="currentColor"/>' },
  { id: 'duck', label: '鸭肉慢焙条', en: 'DUCK STRIPS', accent: '#b49a5b', pale: '#e4d6b4', rotation: -5, pet: 'FOR YOUR DOG', drawing: '<path d="M-31 2h32v-13c-3-23 26-21 25-5h11v7H24v17c0 21-50 29-55-6Z"/><path d="M-20 9c12 8 23 8 30 0M0 25v8M12 23v10M-5 33h10M7 33h10"/><circle cx="19" cy="-17" r="1" fill="currentColor"/>' },
  { id: 'tuna', label: '金枪鱼小方丁', en: 'TUNA CUBES', accent: '#9990ab', pale: '#e0dbe7', rotation: 6, pet: 'FOR YOUR CAT', drawing: '<path d="M-35 0C-11-23 15-23 34 0 15 23-11 23-35 0Zm0 0-16-16v32l16-16ZM-8-16l6-13 15 14M-2 17l8 11 10-15"/><path d="M18-11c-4 7-4 15 0 22"/><circle cx="25" cy="-4" r="1.5" fill="currentColor"/>' },
  { id: 'beef', label: '牛肉分享片', en: 'BEEF SLICES', accent: '#af7b66', pale: '#e5cfc1', rotation: -7, pet: 'FOR YOUR DOG', drawing: '<path d="M-19-15h38l-4 32c-1 14-29 14-30 0l-4-32ZM-19-14c-21-18-25 9-3 8M19-14c21-18 25 9 3 8M-15-16l-5-15M15-16l5-15"/><ellipse cx="0" cy="16" rx="15" ry="9"/><path d="M-8-4v3M8-4v3M-5 16v1M5 16v1"/>' },
  { id: 'rabbit', label: '兔肉轻巧粒', en: 'RABBIT NIBBLES', accent: '#759381', pale: '#cfdfd3', rotation: 4, pet: 'FOR YOUR CAT', drawing: '<path d="M-10-12c-23-38 0-46 10-2 10-44 33-36 10 2 25 15 13 42-10 42s-35-27-10-42Z"/><path d="M-8 4v2M8 4v2M-3 12l3 3 3-3M0 15v5M-12 13l-13-2M12 13l13-2"/>' },
];
const paw = '<ellipse cx="-13" cy="-8" rx="4" ry="5" transform="rotate(-22 -13 -8)"/><ellipse cx="-4" cy="-15" rx="4" ry="5"/><ellipse cx="7" cy="-14" rx="4" ry="5"/><ellipse cx="15" cy="-5" rx="4" ry="5" transform="rotate(25 15 -5)"/><path d="M-12 8c0-6 7-14 13-14S15 3 15 9c0 7-8 5-13 5S-12 17-12 8Z"/>';
for (const p of products) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 440">
  <title>${p.label}示例包装</title>
  <defs>
    <linearGradient id="paper" x1="0" x2="1" y1="0" y2=".15"><stop stop-color="#e6ddc5"/><stop offset=".28" stop-color="#fbf5e6"/><stop offset=".7" stop-color="#f5edda"/><stop offset="1" stop-color="#dcd3bb"/></linearGradient>
    <linearGradient id="color" x1="0" x2="1"><stop stop-color="${p.accent}"/><stop offset=".3" stop-color="${p.pale}"/><stop offset=".9" stop-color="${p.pale}"/><stop offset="1" stop-color="${p.accent}"/></linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>
    <filter id="paper-shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="10" dy="13" stdDeviation="8" flood-color="#3e4d31" flood-opacity=".15"/></filter>
    <clipPath id="bag"><path d="M151 63Q240 68 329 63L340 347Q344 365 324 371Q240 389 155 371Q135 365 139 347Z"/></clipPath>
  </defs>
  <ellipse cx="246" cy="379" rx="109" ry="11" fill="#56674d" opacity=".18" filter="url(#shadow)"/>
  <g transform="rotate(${p.rotation} 240 230)" filter="url(#paper-shadow)">
    <path d="M151 63Q240 68 329 63L340 347Q344 365 324 371Q240 389 155 371Q135 365 139 347Z" fill="url(#paper)"/>
    <g clip-path="url(#bag)"><path d="M132 202H350V350H132Z" fill="url(#color)"/><path d="M145 342Q238 359 337 342v40H145Z" fill="${p.accent}" opacity=".85"/><path d="M155 71Q240 75 326 71M154 82Q240 86 326 82M153 93Q240 97 327 93" fill="none" stroke="#a8a18d" stroke-opacity=".45"/><path d="M152 63 148 339 157 364M328 64 333 339 324 367" fill="none" stroke="#fff" stroke-width="2" opacity=".33"/></g>
    <g transform="translate(240 133) scale(.6)" fill="#38553c">${paw}</g>
    <text x="240" y="163" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="18" letter-spacing="1.2" fill="#2b4a36">PAW &amp; PANTRY</text>
    <text x="240" y="183" text-anchor="middle" font-family="Microsoft YaHei,sans-serif" font-size="9" letter-spacing="3" fill="#577056">爪间小食</text>
    <g transform="translate(240 248) scale(.65)" fill="none" color="#435b42" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">${p.drawing}</g>
    <text x="240" y="304" text-anchor="middle" font-family="Microsoft YaHei,sans-serif" font-size="16" letter-spacing="1" fill="#2a4835">${p.label}</text>
    <text x="240" y="322" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" letter-spacing="2" fill="#4c6248">${p.en}</text>
    <text x="240" y="363" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" letter-spacing="2" fill="#fcfaee">${p.pet}</text>
  </g>
  <g transform="translate(342 348) rotate(20)"><rect x="0" y="0" width="27" height="14" rx="4" fill="#b98e62"/><path d="M3 3h17M6 7h15M4 10h18" stroke="#d7b18a" stroke-width="1.5"/></g>
  <g transform="translate(367 372) rotate(-18)"><rect width="23" height="14" rx="3" fill="#c29a72"/><path d="M3 4h17M5 8h13" stroke="#d7b18a" stroke-width="1.2"/></g>
  <g transform="translate(119 359) rotate(-12)"><rect width="19" height="12" rx="3" fill="#bd946c"/><path d="M4 3h12M3 7h12" stroke="#d7b18a" stroke-width="1.2"/></g>
  </svg>`;
  await writeFile(`${assets}/${p.id}.svg`, svg, 'utf8');
}
console.log('Created 6 original packaging illustrations.');
