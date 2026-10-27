/* ===== เวอร์ชันมือถือ (PWA): ไม่ใช้ chrome.* ===== */
const store = { get: () => JSON.parse(localStorage.getItem('cfg') || '{}'), set: o => localStorage.setItem('cfg', JSON.stringify({ ...store.get(), ...o })) };
const REDIRECT = location.origin + location.pathname;
const $ = id => document.getElementById(id);
const BUILTIN = ['Mali', 'Itim', 'Sriracha', 'Pattaya', 'Chonburi', 'Mitr', 'Kodchasan', 'Kanit'];
const FILT = { none: 'none', bright: 'brightness(1.1) saturate(1.2)', warm: 'sepia(.25) saturate(1.3) brightness(1.05)', soft: 'contrast(.9) brightness(1.1) saturate(1.1)', bw: 'grayscale(1)' };
const CTA = `🐱 โรงแรมแมวอารี | Ari Cat Hotel
💰 เริ่มต้น 250 บาท/วัน | From 250 THB/night
✅ แอร์ 24 ชม. • เครื่องฟอกอากาศ • ดูแลตลอด 24 ชม. • อัพเดทเจ้านาย 3 เวลา
📞 095-2946491 | WhatsApp 099-4291439
Line: @aricathotel https://lin.ee/IJYfsgb
💬 m.me/AriCatHotel
📍 หมู่บ้านศรีสุชาติแกรนด์วิว 2 หลังอีเกียภูเก็ต
https://maps.app.goo.gl/8jnssnGULM5fDJU67`;
const HOTEL_INFO = `Ari Cat Hotel (โรงแรมแมวอารี), cat boarding in Phuket, from 250 THB/day. Free: food/water bowls (no food), litter box, Coway filtered water, soft beds, private sleeping nook and scratching post in each room, shared toys, 3 daily pet updates to owners, 24h air purifier, 24h air-con, 24h security. Cleanliness: litter cleaned after every use, each room cleaned separately, pet-safe cleaning products.`;

let pagesList = [];
const cv = $('cv'), ctx = cv.getContext('2d');
const toast = m => { const t = $('toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(toast.h); toast.h = setTimeout(() => t.style.display = 'none', 3500); };
const api = () => 'v' + ($('apiVer').value.replace(/^v/, '') || '23.0');

/* ---------- tabs ---------- */
document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
  document.querySelectorAll('nav button,section').forEach(e => e.classList.remove('on'));
  b.classList.add('on'); $(b.dataset.tab).classList.add('on');
  if (b.dataset.tab === 'queue') renderQueue();
});

/* ---------- settings ---------- */
const KEYS = ['appId', 'appSecret', 'pageId', 'pageToken', 'claudeKey', 'apiVer', 'perDay', 't1', 't2'];
async function loadSettings() {
  const st = store.get();
  KEYS.forEach(k => { if (st[k]) $(k).value = st[k]; });
  $('redir').value = REDIRECT;
}
$('save').onclick = async () => {
  const o = {}; KEYS.forEach(k => o[k] = $(k).value.trim());
  if ($('pages').value) { const p = pagesList.find(x => x.id === $('pages').value); if (p) { o.pageId = p.id; o.pageToken = p.access_token; $('pageId').value = p.id; $('pageToken').value = p.access_token; } }
  store.set(o); toast('บันทึกแล้ว ✅');
};
$('login').onclick = () => {
  const appId = $('appId').value.trim(); if (!appId) return toast('กรอก App ID ก่อน');
  store.set({ appId, appSecret: $('appSecret').value.trim(), apiVer: $('apiVer').value.trim() });
  location.href = `https://www.facebook.com/${api()}/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(REDIRECT)}&response_type=token&scope=pages_show_list,pages_manage_posts,pages_read_engagement`;
};
async function finishLogin() {
  let ut = new URLSearchParams(location.hash.slice(1)).get('access_token');
  if (!ut) return;
  history.replaceState(null, '', location.pathname);
  document.querySelector('[data-tab=settings]').click();
  try {
    const appId = $('appId').value.trim(), sec = $('appSecret').value.trim();
    if (sec) {
      const j = await (await fetch(`https://graph.facebook.com/${api()}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${sec}&fb_exchange_token=${ut}`)).json();
      if (j.access_token) ut = j.access_token;
    }
    const r = await (await fetch(`https://graph.facebook.com/${api()}/me/accounts?limit=100&access_token=${ut}`)).json();
    if (r.error) throw new Error(r.error.message);
    pagesList = r.data || [];
    $('pages').innerHTML = pagesList.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    toast(pagesList.length ? 'เลือกเพจแล้วกด "บันทึกการตั้งค่า"' : 'ไม่พบเพจที่คุณดูแล');
  } catch (e) { toast('เข้าสู่ระบบไม่สำเร็จ: ' + e.message); }
}
$('test').onclick = async () => {
  try {
    const j = await (await fetch(`https://graph.facebook.com/${api()}/${$('pageId').value.trim()}?fields=name&access_token=${$('pageToken').value.trim()}`)).json();
    toast(j.error ? '❌ ' + j.error.message : '✅ เชื่อมต่อเพจ: ' + j.name);
  } catch (e) { toast('❌ ' + e.message); }
};

/* ---------- fonts ---------- */
function fillFonts(custom = []) {
  $('font').innerHTML = [...BUILTIN, ...custom, 'Tahoma', 'Comic Sans MS'].map(f => `<option>${f}</option>`).join('');
}
async function loadCustomFonts() {
  const names = [];
  for (const f of await DB.all('fonts')) {
    try { const ff = new FontFace(f.name, f.data); await ff.load(); document.fonts.add(ff); names.push(f.name); } catch { }
  }
  fillFonts(names);
}
$('fontUp').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  const name = f.name.replace(/\.[^.]+$/, '');
  await DB.put('fonts', { name, data: await f.arrayBuffer() });
  await loadCustomFonts(); $('font').value = name; render(); toast('เพิ่มฟอนต์ ' + name);
};

/* ---------- editor (หลายรูป) ---------- */
const CTRL = ['txt', 'font', 'size', 'sw', 'c1', 'c2', 'c3', 'flt', 'frame', 'wm', 'wmPos', 'wmSize', 'wmOp'];
let items = [], cur = 0;
const defaults = () => ({ txt: '', font: 'Mali', size: '9', sw: '10', c1: '#ffffff', c2: '#ff5c93', c3: '#ffd1e0', flt: 'none', frame: '0', ...wmPref(), pos: { x: .5, y: .85 } });
const isVideo = () => items.length && items[0].video;
$('file').onchange = e => {
  let fs = [...e.target.files]; e.target.value = '';
  if (!fs.length) return;
  const v = fs.find(f => f.type.startsWith('video'));
  if (v) { if (fs.length > 1 || items.length) toast('วิดีโอใช้ได้ครั้งละ 1 ไฟล์ (ไม่ปนกับรูป) จึงแทนที่ของเดิม'); fs = [v]; clearItems(); }
  else if (isVideo()) clearItems();
  const room = 10 - items.length;
  if (fs.length > room) { toast('จำกัด 10 รูปต่อโพสต์'); fs = fs.slice(0, room); }
  const start = items.length;
  fs.forEach(f => {
    const it = { file: f, url: URL.createObjectURL(f), video: f.type.startsWith('video'), s: defaults(), img: null };
    if (!it.video) { it.img = new Image(); it.img.onload = () => { if (items[cur] === it) render(); }; it.img.src = it.url; }
    items.push(it);
  });
  buildThumbs(); if (items.length) select(Math.min(start, items.length - 1));
};
function clearItems() { items.forEach(it => URL.revokeObjectURL(it.url)); items = []; cur = 0; }
function buildThumbs() {
  $('thumbs').innerHTML = '';
  items.forEach((it, i) => {
    const w = document.createElement('div'); w.className = 'th';
    const t = document.createElement(it.video ? 'video' : 'img'); t.src = it.url; t.onclick = () => select(i);
    const x = document.createElement('button'); x.className = 'x'; x.textContent = '✕'; x.title = 'ลบ';
    x.onclick = ev => { ev.stopPropagation(); removeItem(i); };
    w.append(t, x); $('thumbs').append(w);
  });
}
function removeItem(i) {
  URL.revokeObjectURL(items[i].url); items.splice(i, 1);
  buildThumbs();
  if (!items.length) {
    cv.style.display = 'none'; $('editor').style.display = 'none'; $('vid').style.display = 'none'; $('vid').removeAttribute('src'); $('vid').load();
    return;
  }
  select(Math.min(i < cur ? cur - 1 : cur, items.length - 1));
}
function select(i) {
  cur = i; const it = items[i];
  [...$('thumbs').children].forEach((t, k) => t.classList.toggle('on', k === i));
  if (it.video) { cv.style.display = 'none'; $('editor').style.display = 'none'; $('vid').style.display = 'block'; $('vid').src = it.url; return; }
  $('vid').style.display = 'none'; cv.style.display = 'block'; $('editor').style.display = 'block';
  CTRL.forEach(k => $(k).value = it.s[k]);
  render();
}
const PAIRS = [['#ffffff', '#ff5c93'], ['#fff7a8', '#e0457b'], ['#ffffff', '#7a4bd6'], ['#ffe45e', '#ff6b35'], ['#ffffff', '#2bb3a3'], ['#ffd1e8', '#8a2be2'], ['#ffffff', '#f58220'], ['#ffffff', '#4a90e2'], ['#ff6fa5', '#ffffff'], ['#5b2a86', '#fff3b0'], ['#fffbe6', '#c2185b'], ['#b9fbc0', '#1b5e20']];
function randomStyle(it) {
  const fonts = [...$('font').options].map(o => o.value), p = PAIRS[Math.floor(Math.random() * PAIRS.length)];
  Object.assign(it.s, { font: fonts[Math.floor(Math.random() * fonts.length)], c1: p[0], c2: p[1], sw: String(6 + Math.floor(Math.random() * 9)), size: String(7 + Math.floor(Math.random() * 6)) });
}
$('rnd').onclick = () => { const it = items[cur]; if (!it || it.video) return; randomStyle(it); CTRL.forEach(k => $(k).value = it.s[k]); render(); };
$('rndAll').onclick = () => { items.forEach(it => { if (!it.video) randomStyle(it); }); if (items[cur] && !items[cur].video) { CTRL.forEach(k => $(k).value = items[cur].s[k]); render(); } toast('สุ่มสไตล์ให้ทุกรูปแล้ว 🎲'); };
async function drawBase(c, it, maxW = 1080) {
  const s = it.s, x = c.getContext('2d'), img = it.img;
  try { await document.fonts.load(`40px "${s.font}"`, s.txt || 'ก A'); } catch { }
  const W = Math.min(maxW, img.naturalWidth), H = Math.round(img.naturalHeight * W / img.naturalWidth);
  c.width = W; c.height = H;
  x.filter = FILT[s.flt]; x.drawImage(img, 0, 0, W, H); x.filter = 'none';
  if (s.frame === '1') { const lw = W * .03; x.lineWidth = lw; x.strokeStyle = s.c3; x.strokeRect(lw / 2, lw / 2, W - lw, H - lw); }
  if (s.txt.trim()) {
    const fs = W * s.size / 100;
    x.font = `${fs}px "${s.font}"`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.lineWidth = fs * s.sw / 100; x.strokeStyle = s.c2; x.fillStyle = s.c1;
    s.txt.split('\n').forEach((l, i) => {
      const px = s.pos.x * W, py = s.pos.y * H + i * fs * 1.2;
      if (x.lineWidth > 0) x.strokeText(l, px, py);
      x.fillText(l, px, py);
    });
  }
}
function render() { const it = items[cur]; if (it && it.img && it.img.complete) return drawItem(cv, it); }
CTRL.forEach(k => $(k).addEventListener('input', () => { if (items[cur] && !items[cur].video) { items[cur].s[k] = $(k).value; if (k.startsWith('wm')) { const q = items[cur].s; localStorage.setItem('wmPref', JSON.stringify({ wm: q.wm, wmPos: q.wmPos, wmSize: q.wmSize, wmOp: q.wmOp })); } render(); } }));
$('applyAll').onclick = () => { const s = items[cur].s; items.forEach(o => { if (!o.video) o.s = { ...s, pos: { ...s.pos } }; }); toast('ใช้สไตล์กับทุกรูปแล้ว'); };
let drag = false;
const mv = e => { const r = cv.getBoundingClientRect(); items[cur].s.pos = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; render(); };
cv.onpointerdown = e => { if (!items[cur]) return; drag = true; cv.setPointerCapture(e.pointerId); mv(e); };
cv.onpointermove = e => drag && mv(e);
cv.onpointerup = () => drag = false;

/* ---------- โลโก้โรงแรม (แปะบนรูป) ---------- */
const wmPref = () => { const d = { wm: '1', wmPos: 'br', wmSize: '18', wmOp: '95' }; try { return { ...d, ...JSON.parse(localStorage.getItem('wmPref') || '{}') }; } catch { return d; } };
let LOGO = new Image();
function loadLogo() { LOGO = new Image(); LOGO.src = localStorage.getItem('customLogo') || 'logo.png'; return LOGO.decode ? LOGO.decode().catch(() => { }) : Promise.resolve(); }
let logoReady = loadLogo();
async function drawLogo(c, s) {
  if (s.wm !== '1') return;
  await logoReady; if (!LOGO.naturalWidth) return;
  const x = c.getContext('2d'), W = c.width, H = c.height, w = W * s.wmSize / 100, h = w * LOGO.naturalHeight / LOGO.naturalWidth, m = W * .03;
  const px = { l: m, r: W - w - m, c: (W - w) / 2 }, py = { t: m, b: H - h - m, c: (H - h) / 2 };
  x.save(); x.globalAlpha = s.wmOp / 100; x.drawImage(LOGO, px[s.wmPos[1]], py[s.wmPos[0]], w, h); x.restore();
}
async function drawItem(c, it, maxW = 1080) { await drawBase(c, it, maxW); await drawLogo(c, it.s); }
$('logoUp').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const im = new Image(); im.src = URL.createObjectURL(f); await im.decode();
    const k = Math.min(1, 600 / Math.max(im.naturalWidth, im.naturalHeight)), t = document.createElement('canvas');
    t.width = Math.round(im.naturalWidth * k); t.height = Math.round(im.naturalHeight * k);
    t.getContext('2d').drawImage(im, 0, 0, t.width, t.height);
    localStorage.setItem('customLogo', t.toDataURL('image/png'));
    logoReady = loadLogo(); await logoReady; render(); toast('เปลี่ยนโลโก้แล้ว');
  } catch { toast('เปลี่ยนโลโก้ไม่สำเร็จ ลองไฟล์ PNG/JPG ที่เล็กลง'); }
  e.target.value = '';
};
$('logoReset').onclick = async () => { localStorage.removeItem('customLogo'); logoReady = loadLogo(); await logoReady; render(); toast('ใช้โลโก้โรงแรมเดิมแล้ว'); };

async function finalBlobs() {
  if (isVideo()) return [items[0].file];
  const out = [];
  for (const it of items) { const c = document.createElement('canvas'); await drawItem(c, it); out.push(await new Promise(r => c.toBlob(r, 'image/jpeg', .92))); }
  return out;
}

/* ---------- captions ---------- */
/* ---------- คลังแคปชั่นสุ่ม ---------- */
const MOODS = [['play', '🎾 ขี้เล่น'], ['warm', '🤍 อบอุ่น'], ['funny', '😹 ตลกๆ'], ['cute', '🥹 น่ารักฟุ้งฟิ้ง'], ['promo', '📣 ชวนจอง/โปรโมชั่น'], ['clean', '🧼 สะอาดน่าไว้ใจ'], ['miss', '📸 คิดถึง/อัพเดทเจ้านาย'], ['holiday', '🏖️ เทศกาล/วันหยุด']];
const MOOD_RE = { play: /เล่น|ซน|สนุก|play/i, warm: /อบอุ่น|อุ่น|ซึ้ง|warm|cozy/i, funny: /ตลก|ขำ|ฮา|funny/i, cute: /น่ารัก|ฟุ้ง|cute/i, promo: /โปร|จอง|ราคา|promo|book/i, clean: /สะอาด|ไว้ใจ|clean/i, miss: /คิดถึง|อัพเดท|อัปเดต|miss/i, holiday: /เทศกาล|วันหยุด|สงกรานต์|ปีใหม่|holiday/i };
const TH_HOOK = {
  play: ['วิ่งซ้ายทีขวาทีทั้งวัน เจ้านายของเรากำลังสนุกสุดๆ 🏃‍♂️', 'ห้องนี้มีแต่เสียงเหมียว เสียงหัวเราะ และของเล่นกระจุยกระจาย 🧶', 'กระโดดโลดเต้นให้หนำใจ ใครว่าแมวขี้เกียจ? 😹', 'วันนี้น้องแมวขอเล่นให้สุดแล้วค่อยนอนต่อ 🎾', 'ของเล่นส่วนกลางเพียบ น้องๆ แย่งกันจนต้องต่อคิว 😆', 'พลังงานล้นปรี่! เพื่อนใหม่ก็ได้ ของเล่นก็ได้เล่น 🐾'],
  warm: ['อบอุ่นเหมือนบ้าน แต่แอร์เย็นกว่าบ้านทาสอีก ❄️🏠', 'ที่นอนนุ่มๆ หลุมนอนส่วนตัว หลับสบายจนตื่นมากินข้าวอย่างเดียว 😴', 'ฝากเจ้านายไว้กับเรา แล้วไปเที่ยวให้สบายใจได้เลย 💕', 'ทุกวันมีคนคอยดูแล ใส่ใจเหมือนน้องเป็นลูกของเรา 🤍', 'แสงแดดอ่อนๆ ที่นอนนุ่มๆ ความสุขของน้องแมวง่ายๆ แค่นี้ ☀️', 'ห่างบ้านแต่ไม่ห่างความรัก น้องอยู่กับเราอบอุ่นแน่นอน 🫶'],
  funny: ['เจ้านายถามว่า "ทาสไปไหน?" ... เดี๋ยวเรากลับมารับ ฝากอัพเดทไว้ 3 เวลาแล้ว 😹', 'ไม่ได้อ้วน แค่ฟูเกินไป! 🐱🍗', 'น้องบอกว่า "ทาสไปเที่ยวต่อได้ เราขออยู่ต่ออีก 3 วัน" 😼', 'ท่านอนนี้ต้องส่งประกวด ใครเห็นแล้วใจละลายบ้าง? 🫠', 'เหมียวไม่เข้าใจเรื่องค่าเงิน แต่เข้าใจเรื่องแอร์เย็นๆ นะ 💸❄️', 'รีวิวจากเจ้านาย: "ห้องดี อาหารดี ทาสไม่ต้องรีบมารับ" ⭐⭐⭐⭐⭐'],
  cute: ['น่ารักจนต้องหยุดมองสักห้านาที 🥹💗', 'ตาโตๆ แบบนี้ ใครจะไปใจแข็งได้ล่ะ 👀', 'ฟูๆ นุ่มๆ หน้ากลมๆ ความน่ารักระดับสูงสุด ☁️🐱', 'ขนฟู หูตั้ง ตาแป๋ว ครบทุกองค์ประกอบของความน่ารัก 🌸', 'แค่เห็นหน้าน้อง ความเหนื่อยก็หายไปหมด 🍼', 'วันนี้น้องน่ารักกว่าเมื่อวาน (และพรุ่งนี้จะน่ารักกว่าวันนี้) ✨'],
  promo: ['กำลังจะไปเที่ยว? จองห้องให้เจ้านายก่อนเต็มนะ 📣', 'เริ่มต้นเพียง 250 บาท/วัน ฟรีของใช้จุกๆ ครบ! 🎁', 'ช่วงเทศกาลห้องพักหมดไว มาจองคิวล่วงหน้ากันเลย 🗓️', 'ฝากเจ้านายง่ายๆ แค่ทักแชท 💬', 'แอร์ 24 ชม. เครื่องฟอกอากาศ ที่นอนนุ่ม ราคาเริ่มต้น 250 เท่านั้น 🏨', 'อยากให้ทริปนี้ไร้กังวล ฝากน้องไว้กับเราสิ 🧳'],
  clean: ['คลีนกระบะทุกครั้งที่น้องทำธุระเสร็จ สะอาดจริง ไม่ต้องห่วง 🧼', 'แยกทำความสะอาดทีละห้อง ไม่ปะปน ปลอดภัยทั้งน้องและเพื่อนๆ 🧴', 'ใช้ผลิตภัณฑ์ทำความสะอาดสำหรับสัตว์เลี้ยงโดยเฉพาะ ✨', 'เครื่องฟอกอากาศเปิดตลอด 24 ชั่วโมง หายใจโล่งทั้งโรงแรม 🌿', 'สะอาดเหนือระดับ เพราะน้องแมวคือคนสำคัญ 💖', 'ห้องหอมสะอาด น้ำดื่มผ่านเครื่องกรอง Coway ทุกวัน 💧'],
  miss: ['ทาสจ๋า คิดถึงน้องไหม? นี่ภาพล่าสุดของเจ้านาย 📸', 'อัพเดทเจ้านาย 3 เวลา ทาสไม่ต้องเป็นห่วง 🕘', 'วันนี้น้องกินข้าวหมด เล่นสนุก นอนหลับสบาย รายงานเรียบร้อย ✅', 'น้องส่งข่าวมาบอกว่า "สบายดี อย่าคิดถึงมาก" 😽', 'ห่างกันแค่ตัว แต่ใจเรายังดูแลน้องทุกนาที 💌', 'ส่งความคิดถึงจากน้องมาให้ทาสตอนนี้เลย 🐾'],
  holiday: ['วันหยุดยาวนี้ ไปเที่ยวให้เต็มที่ เจ้านายเราดูแลเอง 🏖️', 'ปีใหม่ สงกรานต์ หรือทริปสั้นๆ ฝากน้องไว้ที่เรา ✈️', 'ลาพักร้อนทั้งที ไม่ต้องห่วงใครที่บ้าน 🌴', 'เทศกาลนี้ให้เจ้านายได้พักผ่อนบ้าง 🎉', 'จองก่อนวันหยุดเต็ม ห้องพักหมดเร็วมากช่วงเทศกาล 🚨', 'เที่ยวไกลแค่ไหน น้องแมวสบายใจแน่นอน 🧳💕'],
};
const TH_BODY = ['ที่นี่มีแอร์เย็นตลอด 24 ชม. ที่นอนนุ่ม และหลุมนอนส่วนตัวให้น้องทุกห้อง', 'ฟรีกระบะทราย ชามอาหาร น้ำกรอง Coway และของเล่นส่วนกลาง', 'มีระบบรักษาความปลอดภัย 24 ชม. และอัพเดทเจ้านายให้ทาสทราบวันละ 3 เวลา', 'ทุกห้องมีที่ข่วนเล็บส่วนตัว ให้น้องได้ลับเล็บอย่างมีความสุข', 'เครื่องฟอกอากาศเปิดตลอด อากาศสะอาด น้องหายใจสบาย', 'เราคลีนกระบะทุกครั้งที่น้องทำธุระเสร็จ และแยกทำความสะอาดทีละห้อง', 'ราคาเริ่มต้น 250 บาท/วัน พร้อมของใช้ฟรีจุกๆ', 'ทีมงานรักแมวดูแลใกล้ชิด ใส่ใจทุกรายละเอียด'];
const TH_END = ['จองห้องให้เจ้านายได้เลยนะ 💌', 'ทักแชทมาได้ตลอด 🫶', 'พาน้องมาเที่ยวกับเรานะ 🐾', '', ''];
const EN_LINE = {
  play: ['Zoomies approved! Our guests are having the time of their lives 🎾', 'Toys, tunnels and endless play — a purr-fect vacation for your cat', 'No boring days here — only play, nap, repeat 😹', 'Energy level: maximum. Fun level: unlimited 🐾'],
  warm: ['A cozy second home for your fur-baby, with love in every corner 🤍', 'Soft beds, cool air and gentle care — your cat is in good paws', 'Go enjoy your trip. We’ll cuddle your kitty like our own 💕', 'Warm hearts, comfy beds, happy whiskers ☀️'],
  funny: ['Plot twist: your cat doesn’t want to come home 😹', 'Not fat, just fluffy. Extra fluffy. 🐱', 'Your cat called — they’re extending the vacation 🤣', 'Hotel review from the cat: “5 stars, would nap again.” ⭐'],
  cute: ['Warning: extreme cuteness overload 🥹', 'Those eyes could melt anyone’s heart 💗', 'Fluffy, round and utterly adorable ☁️', 'Cuteness level: off the charts ✨'],
  promo: ['Planning a trip? Book your cat’s stay early — rooms fill up fast! 📣', 'From just 250 THB/night, with lots of free goodies 🎁', 'Worry-free travel starts with a happy cat. Book now! 🧳', 'Air-con, air purifier, soft beds & 24h security — all included 🏨'],
  clean: ['Litter cleaned after every use. Every room cleaned separately 🧼', 'Pet-safe cleaning products only — your cat deserves the best ✨', '24h air purifier, filtered water, spotless rooms 🌿', 'Hygiene first, always. Your cat’s health is our priority 💖'],
  miss: ['Daily updates, 3 times a day — so you never have to miss your kitty 📸', 'Your cat says: “I’m great! Don’t miss me too much.” 😽', 'Fed, played, napped. Report complete ✅', 'Sending whisker kisses to the humans back home 💌'],
  holiday: ['Holiday plans? Your cat’s covered 🏖️', 'Travel far, worry less — we’ve got your cat 🌴', 'Festive season fills up fast — reserve your cat’s room today 🚨', 'Enjoy your break. We’ll take care of the purr-sonality at home ✈️'],
};
const EN_END = ['Book your stay today!', 'DM us to reserve 💬', 'See you soon, meow! 🐾', '', ''];
const TAG_TH = ['#โรงแรมแมว', '#ฝากแมวภูเก็ต', '#โรงแรมแมวภูเก็ต', '#แมวน่ารัก', '#ทาสแมว', '#ฝากแมว', '#แมวภูเก็ต', '#รักแมว', '#แมวเหมียว', '#ทาสแมวภูเก็ต', '#ฝากแมวเที่ยว', '#ที่พักแมว'];
const TAG_EN = ['#PhuketCatHotel', '#CatBoarding', '#CatHotel', '#PhuketPets', '#CatLovers', '#CatsOfInstagram', '#CatsOfPhuket', '#PetFriendly', '#KittyVacation', '#CatCare', '#Phuket', '#CatLife'];
const TAG_MOOD = { promo: '#โปรโมชั่น #BookNow', holiday: '#วันหยุด #HolidayPlans', clean: '#สะอาด #CleanAndSafe', cute: '#แมวฟู #CuteCats', funny: '#แมวตลก #FunnyCats', play: '#แมวซน #PlayTime', miss: '#อัพเดทน้องแมว #CatUpdate', warm: '#ฝากรัก #CozyCats' };
const TAGS = '#โรงแรมแมวอารี #AriCatHotel #โรงแรมแมว #ฝากแมวภูเก็ต #PhuketCatHotel #CatBoarding #CatHotel #PhuketPets #CatLovers';
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
// เลือกข้อความที่ไม่ซ้ำกับ 5 ครั้งล่าสุด
function pickFresh(arr, key) {
  let rec = []; try { rec = JSON.parse(localStorage.getItem('recent_' + key) || '[]'); } catch { }
  const fresh = arr.filter(x => !rec.includes(x)), v = pick(fresh.length ? fresh : arr);
  try { localStorage.setItem('recent_' + key, JSON.stringify([...rec, v].slice(-5))); } catch { }
  return v;
}
function moodKey(text) { for (const k in MOOD_RE) if (MOOD_RE[k].test(text || '')) return k; return pick(Object.keys(TH_HOOK)); }
function templateCaption(mood, extra) {
  const k = moodKey(mood);
  const th = [extra, pickFresh(TH_HOOK[k], 'th' + k), Math.random() < .8 ? pickFresh(TH_BODY, 'body') : '', pick(TH_END)].filter(Boolean).join('\n');
  const en = [pickFresh(EN_LINE[k], 'en' + k), pick(EN_END)].filter(Boolean).join(' ');
  const tags = ['#โรงแรมแมวอารี', '#AriCatHotel', ...shuffle(TAG_TH).slice(0, 4), ...shuffle(TAG_EN).slice(0, 4), TAG_MOOD[k]].join(' ');
  return { th, en, tags };
}
function buildMoodChips() {
  const box = $('moods'); if (!box) return;
  box.innerHTML = '';
  const sync = () => [...box.children].forEach(b => b.classList.toggle('on', b.dataset.v === $('mood').value.trim()));
  MOODS.forEach(([k, label]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = label;
    b.dataset.v = label.replace(/^\S+\s/, '');
    b.onclick = () => { $('mood').value = $('mood').value.trim() === b.dataset.v ? '' : b.dataset.v; sync(); };
    box.append(b);
  });
  const r = document.createElement('button'); r.type = 'button'; r.className = 'chip'; r.textContent = '🎲 สุ่มให้เลย';
  r.onclick = () => { $('mood').value = ''; sync(); }; box.append(r);
  $('mood').addEventListener('input', sync);
}

async function genCaption() {
  const st = store.get();
  const mood = $('mood').value.trim(), extra = $('extra').value.trim();
  let th, en, tags = TAGS;
  if (st.claudeKey) {
    try {
      const content = [];
      for (const it of items.filter(i => !i.video && i.img).slice(0, 3)) { const t = document.createElement('canvas'); await drawItem(t, it, 640); content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: t.toDataURL('image/jpeg', .7).split(',')[1] } }); }
      const prev = (await DB.all('posts')).slice(-3).map(p => p.caption.slice(0, 120)).join(' | ');
      content.push({ type: 'text', text: `อารมณ์: ${mood || 'ให้คุณเลือกเอง'}\nแคปชั่นเสริมจากเจ้าของ: ${extra || '-'}\nโพสต์ก่อนหน้า (ห้ามซ้ำ): ${prev || '-'}` });
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': st.claudeKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-5-5', max_tokens: 1000, temperature: 1,
          system: `คุณเป็นแอดมินเพจโรงแรมแมวที่เก่งการตลาด เขียนโพสต์ Facebook ให้หยุดนิ้วคนที่กำลังเลื่อน: เปิดด้วยประโยคเด็ด ภาษาน่ารัก เป็นกันเอง ใช้อีโมจิพอดี สั้นกระชับ ไม่เกิน 4 บรรทัดต่อภาษา ถ้ามีรูปให้เขียนให้เข้ากับสิ่งที่เห็นในรูป ใช้โครงประโยคและมุมมองที่ต่างจากโพสต์ก่อนหน้าทุกครั้ง ห้ามแต่งข้อมูลโรงแรมนอกเหนือจากนี้: ${HOTEL_INFO}\nตอบเป็น JSON เท่านั้น ไม่มี markdown: {"th":"แคปชั่นไทย","en":"English caption","hashtags":"#แฮชแท็กไทย #EnglishHashtags (8-12 อัน ผสม 2 ภาษา)"}`,
          messages: [{ role: 'user', content }]
        })
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message);
      const o = JSON.parse(j.content.map(c => c.text || '').join('').replace(/```json|```/g, '').trim());
      th = o.th; en = o.en; tags = o.hashtags || TAGS;
    } catch (e) { toast('AI ใช้ไม่ได้ ใช้แบบสำเร็จรูปแทน: ' + e.message); }
  }
  if (!th) ({ th, en, tags } = templateCaption(mood, extra));
  return [th, en, $('cta').checked ? CTA : '', tags].filter(Boolean).join('\n\n');
}
$('gen').onclick = async () => { $('gen').disabled = true; $('caption').value = await genCaption(); $('gen').disabled = false; };

/* ---------- scheduling ---------- */
function nextSlot(st, queued) {
  const times = [st.t1 || '12:00', st.t2 || '19:00'].slice(0, +st.perDay || 2).sort();
  const taken = new Set(queued.map(p => Math.floor(p.scheduledAt / 60000)));
  for (let d = 0; d < 400; d++) for (const t of times) {
    const [h, m] = t.split(':'), dt = new Date();
    dt.setDate(dt.getDate() + d); dt.setHours(+h, +m, 0, 0);
    if (dt.getTime() > Date.now() + 15 * 60e3 && !taken.has(Math.floor(dt.getTime() / 60000))) return dt.getTime();
  }
}
$('add').onclick = async () => {
  if ($('add').disabled) return;
  $('add').disabled = true;
  try { await addToQueue(); } catch (e) { toast('เพิ่มไม่สำเร็จ: ' + e.message); } finally { $('add').disabled = false; }
};
async function addToQueue() {
  if (!items.length) return toast('เลือกรูปหรือวิดีโอก่อน');
  const st = store.get();
  if (!st.pageId || !st.pageToken) return toast('ยังไม่ได้เชื่อมต่อเพจ (แท็บตั้งค่า)');
  const caption = $('caption').value.trim() || await genCaption();
  $('caption').value = caption;
  const blobs = await finalBlobs(), mediaType = isVideo() ? 'video' : 'image';
  const manual = document.querySelector('input[name=mode]:checked').value === 'manual';
  // อ่านคิว -> หาเวลา -> บันทึก ต้องต่อเนื่องกัน (ห้ามมี await ที่ช้าคั่น) เพื่อไม่ให้ได้เวลาซ้ำกัน
  const all = (await DB.all('posts')).filter(p => p.status !== 'error'); // รวมโพสต์ที่ส่งให้ Facebook ตั้งเวลาแล้วด้วย
  let at = manual ? new Date($('when').value).getTime() : nextSlot(st, all);
  if (!at || isNaN(at)) return toast('กรุณาเลือกวันเวลา');
  if (manual && all.some(p => Math.floor(p.scheduledAt / 60000) === Math.floor(at / 60000)) && !confirm('มีโพสต์เวลานี้อยู่แล้ว ต้องการเพิ่มซ้ำเวลาเดิมไหม?')) return;
  if (at < Date.now() + 11 * 60e3) { at = Date.now(); toast('ใกล้เวลาเกินไป (Facebook ต้องล่วงหน้าอย่างน้อย 10 นาที) จะโพสต์ทันที'); }
  const post = { id: crypto.randomUUID(), blobs, mediaType, caption, scheduledAt: at, status: 'queued' };
  await DB.put('posts', post);
  toast('เพิ่มเข้าคิว: ' + new Date(at).toLocaleString('th-TH'));
  await sendPost(post);
}

/* ---------- queue ---------- */
async function renderQueue() {
  const posts = (await DB.all('posts')).sort((a, b) => a.scheduledAt - b.scheduledAt);
  const label = { queued: 'รอส่ง', sent: 'ส่งแล้ว', error: 'ผิดพลาด' };
  $('list').innerHTML = posts.length ? '' : '<small>ยังไม่มีโพสต์</small>';
  for (const p of posts) {
    const bl = p.blobs || [p.blob], url = URL.createObjectURL(bl[0]), d = document.createElement('div');
    d.className = 'q';
    d.innerHTML = `${p.mediaType === 'video' ? `<video src="${url}" muted></video>` : `<img src="${url}">`}
      <div style="flex:1"><b>${new Date(p.scheduledAt).toLocaleString('th-TH')}</b>
      ${bl.length > 1 ? `<span class="tag">📷 ${bl.length} รูป</span> ` : ''}<span class="tag ${p.status}">${label[p.status]}${p.status === 'sent' ? (p.viaFB ? ' (ตั้งเวลาที่ Facebook แล้ว)' : ' (โพสต์แล้ว)') : ''}</span>
      <pre></pre>${p.error ? `<small style="color:#c00">${p.error}</small>` : ''}</div>
      <div><button class="btn alt" data-a="now">โพสต์เลย</button> <button class="btn del" data-a="del">ลบ</button></div>`;
    d.querySelector('pre').textContent = p.caption;
    d.querySelector('[data-a=del]').onclick = async () => { await DB.del('posts', p.id); renderQueue(); };
    const now = d.querySelector('[data-a=now]');
    if (p.status === 'sent') now.remove();
    else now.onclick = async () => { p.status = 'queued'; p.error = ''; p.scheduledAt = Date.now(); await DB.put('posts', p); await sendPost(p); };
    $('list').append(d);
  }
}
$('runNow').onclick = async () => {
  const ps = (await DB.all('posts')).filter(p => p.status === 'queued');
  if (!ps.length) return toast('ไม่มีโพสต์ที่รอส่ง');
  for (const p of ps) await sendPost(p);
};

$('theme').value = localStorage.getItem('theme') || 'auto';
$('theme').onchange = () => { localStorage.setItem('theme', $('theme').value); applyTheme(); };
buildMoodChips(); fillFonts(); loadCustomFonts(); loadSettings().then(finishLogin);

/* ---------- ส่งไป Facebook ทันที (Facebook เป็นผู้ตั้งเวลาโพสต์ให้ ไม่ต้องเปิดแอปค้าง) ---------- */
async function publish(p, st, now) {
  const v = st.apiVer || 'v23.0', blobs = p.blobs || [p.blob], video = p.mediaType === 'video';
  const scheduled = p.scheduledAt - now >= 11 * 60e3;
  const call = async (url, fd) => {
    const j = await (await fetch(url, { method: 'POST', body: fd })).json();
    if (j.error) throw new Error(j.error.message);
    return j;
  };
  const addSchedule = fd => { if (scheduled) { fd.append('published', 'false'); fd.append('scheduled_publish_time', String(Math.floor(p.scheduledAt / 1000))); } };
  const base = `https://graph.facebook.com/${v}/${st.pageId}`;
  if (video || blobs.length === 1) {
    const fd = new FormData();
    fd.append('access_token', st.pageToken);
    fd.append(video ? 'description' : 'caption', p.caption);
    fd.append('source', blobs[0], video ? 'video.mp4' : 'photo.jpg');
    addSchedule(fd);
    const j = await call(video ? `https://graph-video.facebook.com/${v}/${st.pageId}/videos` : `${base}/photos`, fd);
    return { id: j.post_id || j.id, scheduled };
  }
  const ids = [];
  for (const b of blobs) {
    const fd = new FormData();
    fd.append('access_token', st.pageToken); fd.append('source', b, 'photo.jpg'); fd.append('published', 'false');
    ids.push((await call(`${base}/photos`, fd)).id);
  }
  const fd = new FormData();
  fd.append('access_token', st.pageToken); fd.append('message', p.caption);
  ids.forEach((id, i) => fd.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: id })));
  addSchedule(fd);
  return { id: (await call(`${base}/feed`, fd)).id, scheduled };
}
async function sendPost(p) {
  const st = store.get();
  if (!st.pageId || !st.pageToken) return toast('ยังไม่ได้เชื่อมต่อเพจ (แท็บตั้งค่า)');
  toast('⏳ กำลังส่งให้ Facebook… อย่าปิดหน้านี้จนกว่าจะเสร็จ');
  try {
    const r = await publish(p, st, Date.now());
    p.status = 'sent'; p.fbId = r.id; p.viaFB = r.scheduled; p.error = '';
    toast(r.scheduled ? '✅ Facebook ตั้งเวลาโพสต์ให้แล้ว ปิดแอปได้เลย' : '✅ โพสต์แล้ว');
  } catch (e) { p.status = 'error'; p.error = String(e.message || e); toast('❌ ' + p.error); }
  await DB.put('posts', p); renderQueue();
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
