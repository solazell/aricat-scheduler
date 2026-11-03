/* ===== Google Business Profile (โพสต์ลง Google Maps/Search ของโรงแรม) ===== */
const GBP = {
  cfg: () => { try { return JSON.parse(localStorage.getItem('gbp') || '{}'); } catch { return {}; } },
  save: o => localStorage.setItem('gbp', JSON.stringify({ ...GBP.cfg(), ...o })),
  token: () => { const c = GBP.cfg(); return c.token && c.exp > Date.now() ? c.token : null; },
  isExt: () => typeof chrome !== 'undefined' && !!(chrome.identity && chrome.identity.launchWebAuthFlow),
  redirect: () => GBP.isExt() ? chrome.identity.getRedirectURL() : location.origin + location.pathname,
  takeToken(hash) {
    const p = new URLSearchParams(hash.replace(/^#/, '')), t = p.get('access_token');
    if (t) GBP.save({ token: t, exp: Date.now() + ((+p.get('expires_in') || 3600) - 60) * 1000 });
    return !!t;
  },
};
const gchk = j => { if (j && j.error) throw new Error(j.error.message || JSON.stringify(j.error)); return j; };

async function gbpLogin() {
  const c = GBP.cfg(); if (!c.clientId) return toast('กรอก Google OAuth Client ID แล้วกดบันทึกก่อน');
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?response_type=token&state=gbp&prompt=select_account'
    + `&client_id=${encodeURIComponent(c.clientId)}&redirect_uri=${encodeURIComponent(GBP.redirect())}`
    + `&scope=${encodeURIComponent('https://www.googleapis.com/auth/business.manage')}`;
  if (GBP.isExt()) {
    try { const res = await chrome.identity.launchWebAuthFlow({ url, interactive: true }); GBP.takeToken(new URL(res).hash); toast('เข้าสู่ระบบ Google แล้ว'); gbpLoad(); gbpStatus(); }
    catch (e) { toast('เข้าสู่ระบบ Google ไม่สำเร็จ: ' + e.message); }
  } else location.href = url;
}
async function gbpLoadLocations() {
  const tok = GBP.token(); if (!tok) throw new Error('ยังไม่ได้เข้าสู่ระบบ Google (หรือหมดอายุ)');
  const h = { Authorization: 'Bearer ' + tok }, out = [];
  const acc = gchk(await (await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', { headers: h })).json());
  for (const a of acc.accounts || []) {
    const l = gchk(await (await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${a.name}/locations?readMask=name,title&pageSize=100`, { headers: h })).json());
    for (const x of l.locations || []) out.push({ value: `${a.name}/${x.name}`, label: `${x.title} (${a.accountName || a.name})` });
  }
  return out;
}
async function gbpLoad() {
  try {
    const locs = await gbpLoadLocations();
    $('gLoc').innerHTML = locs.map(l => `<option value="${l.value}">${l.label}</option>`).join('');
    const cur = GBP.cfg().location; if (cur) $('gLoc').value = cur;
    toast(locs.length ? 'โหลดรายชื่อสถานที่แล้ว เลือกแล้วกดบันทึก' : 'ไม่พบสถานที่ในบัญชีนี้');
  } catch (e) { toast('❌ ' + e.message); }
}
function gbpStatus() {
  const c = GBP.cfg(), ok = GBP.token();
  $('gStatus').textContent = ok ? `✅ เข้าสู่ระบบแล้ว (หมดอายุ ${new Date(c.exp).toLocaleTimeString('th-TH')})` : '⚪ ยังไม่ได้เข้าสู่ระบบ หรือหมดอายุ (token Google อยู่ได้ ~1 ชม.)';
}

/* ข้อความโพสต์ Google: ตัดเบอร์โทร ลิงก์ และแฮชแท็กออก (Google มักปฏิเสธโพสต์ที่มีเบอร์/ลิงก์ในข้อความ) */
function gbpSummary(cap) {
  return cap.split('\n').filter(l => !/https?:\/\/|m\.me|@\w|\d{2,3}[- ]?\d{3}[- ]?\d{4}|WhatsApp|Line:|📞|💬/i.test(l))
    .map(l => l.replace(/#\S+/g, '').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 1500);
}
async function gbpPatch(id, patch) {
  const f = (await DB.all('posts')).find(x => x.id === id); if (!f) return;
  f.gbp = { ...f.gbp, ...patch }; await DB.put('posts', f);
}
async function gbpSendPost(id) {
  const p = (await DB.all('posts')).find(x => x.id === id); if (!p || !p.gbp) return;
  try {
    const c = GBP.cfg(), tok = GBP.token();
    if (!tok) throw new Error('Google หมดอายุ — ไปแท็บตั้งค่า แล้วกดเข้าสู่ระบบ Google ใหม่');
    if (!c.location) throw new Error('ยังไม่ได้เลือกสถานที่ Google (แท็บตั้งค่า)');
    if (p.mediaType !== 'image') throw new Error('Google รองรับเฉพาะรูปภาพ');
    const h = { Authorization: 'Bearer ' + tok }, base = 'https://mybusiness.googleapis.com/v4/' + c.location;
    // 1) อัปโหลดรูปผ่าน Google เพื่อให้ได้ URL สาธารณะ (รูปจะเข้าแกลเลอรีของโปรไฟล์ด้วย)
    const up = gchk(await (await fetch(base + '/media:startUpload', { method: 'POST', headers: h })).json());
    const put = await fetch('https://mybusiness.googleapis.com/upload/v1/media/' + up.resourceName + '?upload_type=media', { method: 'POST', headers: { ...h, 'Content-Type': 'image/jpeg' }, body: (p.blobs || [p.blob])[0] });
    if (!put.ok) throw new Error('อัปโหลดรูปไป Google ไม่สำเร็จ (' + put.status + ')');
    const m = gchk(await (await fetch(base + '/media', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ mediaFormat: 'PHOTO', locationAssociation: { category: 'ADDITIONAL' }, dataRef: { resourceName: up.resourceName } }) })).json());
    // 2) สร้างโพสต์
    const body = { languageCode: 'th', topicType: 'STANDARD', summary: gbpSummary(p.caption), media: [{ mediaFormat: 'PHOTO', sourceUrl: m.googleUrl }] };
    if (c.cta === 'CALL') body.callToAction = { actionType: 'CALL' };
    else if (c.cta && c.ctaUrl) body.callToAction = { actionType: c.cta, url: c.ctaUrl };
    const r = gchk(await (await fetch(base + '/localPosts', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json());
    await gbpPatch(id, { status: 'sent', name: r.name, error: '' });
    toast('📍 โพสต์ลง Google Business แล้ว');
  } catch (e) { await gbpPatch(id, { status: 'error', error: String(e.message || e) }); toast('📍❌ ' + (e.message || e)); }
  if (typeof renderQueue === 'function') renderQueue();
}
let gbpBusy = false, gbpWarned = false;
async function gbpTick() {
  if (gbpBusy) return; gbpBusy = true;
  try {
    const now = Date.now();
    const due = (await DB.all('posts')).filter(p => p.gbp && p.gbp.status === 'queued' && (p.gbp.mode === 'now' || p.scheduledAt <= now));
    if (!due.length) return;
    if (!GBP.token()) { if (!gbpWarned) { gbpWarned = true; toast('📍 มีโพสต์ Google รอส่ง แต่ยังไม่ได้เข้าสู่ระบบ Google (แท็บตั้งค่า)'); } return; }
    for (const p of due) await gbpSendPost(p.id);
  } finally { gbpBusy = false; }
}
function gbpFlag() {
  const on = $('gbpOn').checked; localStorage.setItem('gbpPref', JSON.stringify({ on, mode: $('gbpMode').value }));
  if (!on) return null;
  if (typeof isVideo === 'function' && isVideo()) { toast('Google ไม่รองรับวิดีโอ จึงข้ามการโพสต์ Google'); return null; }
  return { mode: $('gbpMode').value, status: 'queued' };
}
function gbpTag(p) {
  if (!p.gbp) return '';
  const L = { queued: 'รอส่ง', sent: 'ส่งแล้ว', error: 'ผิดพลาด' }[p.gbp.status];
  return `<div style="margin-top:4px"><span class="tag ${p.gbp.status}">📍 Google: ${L}</span> ${p.gbp.status !== 'sent' ? `<button class="btn alt" data-gbp="${p.id}" style="padding:3px 10px;font-size:12px">ส่ง Google ตอนนี้</button>` : ''}${p.gbp.error ? `<br><small style="color:#c00">${p.gbp.error}</small>` : ''}</div>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-gbp]'); if (b) { b.disabled = true; gbpSendPost(b.dataset.gbp); } });

/* ---------- ผูกกับหน้าจอ ---------- */
(function () {
  const c = GBP.cfg(), pref = (() => { try { return JSON.parse(localStorage.getItem('gbpPref') || '{}'); } catch { return {}; } })();
  $('gClientId').value = c.clientId || ''; $('gCta').value = c.cta ?? 'CALL'; $('gCtaUrl').value = c.ctaUrl || '';
  $('gLocManual').value = c.location || ''; $('gRedir').value = GBP.redirect();
  if (c.location) $('gLoc').innerHTML = `<option value="${c.location}">${c.location}</option>`;
  $('gbpOn').checked = !!pref.on; if (pref.mode) $('gbpMode').value = pref.mode;
  $('gLogin').onclick = gbpLogin; $('gLoad').onclick = gbpLoad;
  $('gSave').onclick = () => {
    GBP.save({ clientId: $('gClientId').value.trim(), location: $('gLocManual').value.trim() || $('gLoc').value, cta: $('gCta').value, ctaUrl: $('gCtaUrl').value.trim() });
    $('gLocManual').value = GBP.cfg().location || ''; toast('บันทึกการตั้งค่า Google แล้ว ✅');
  };
  $('gLoc').onchange = () => { $('gLocManual').value = $('gLoc').value; };
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.get('state') === 'gbp') {
    GBP.takeToken(location.hash); history.replaceState(null, '', location.pathname);
    document.querySelector('[data-tab=settings]').click(); toast('เข้าสู่ระบบ Google แล้ว'); gbpLoad();
  }
  gbpStatus();
  setInterval(() => { gbpStatus(); gbpTick(); }, 60000);
  window.addEventListener('focus', gbpTick);
  setTimeout(gbpTick, 2000);
})();
