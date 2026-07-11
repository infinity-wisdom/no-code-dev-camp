/* ===========================================================
   THE NO-CODE DEVELOPERS CAMP — Front-end logic
   NOTE: GitHub Pages only serves static files. Everything here
   that the blueprint specifies as server-driven (IP+UA hashing,
   payment webhooks, email cron jobs, real leaderboard queries)
   is simulated with localStorage as a PLACEHOLDER so the pages
   are fully clickable. Swap the marked TODO sections for real
   fetch() calls to your backend once it's deployed.
   =========================================================== */

const STORE_KEY = 'ncdc_user_v1';

function loadUser(){
  try{
    return JSON.parse(localStorage.getItem(STORE_KEY)) || null;
  }catch(e){ return null; }
}

function saveUser(user){
  localStorage.setItem(STORE_KEY, JSON.stringify(user));
}

function ensureUser(seed){
  let user = loadUser();
  if(!user){
    user = {
      device_uuid: crypto.randomUUID(),
      first_name: seed?.first_name || 'Friend',
      last_name: seed?.last_name || '',
      email: seed?.email || '',
      phone: seed?.phone || '',
      referral_code: 'NCC' + Math.random().toString(36).slice(2,7).toUpperCase(),
      payment_status: false,
      invites: 3, // placeholder demo value
      guidebook_1_unlocked: true,
      guidebook_2_unlocked: false,
      created_at: Date.now()
    };
    saveUser(user);
  } else if(seed){
    Object.assign(user, seed);
    saveUser(user);
  }
  return user;
}

/* ---------------- Signup form (Page 1) ---------------- */
function initSignupForm(){
  const form = document.getElementById('signup-form');
  if(!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    // TODO: replace with POST /signup — backend creates the IP+UA user_hash record
    ensureUser({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone
    });
    window.location.href = 'offer.html';
  });
}

/* ---------------- Exit-intent modal (Page 2 -> Page 3) ---------------- */
function initExitModal(){
  const trigger = document.getElementById('to-budget-link');
  const overlay = document.getElementById('exit-modal');
  if(!trigger || !overlay) return;
  const proceed = overlay.querySelector('[data-action="proceed"]');
  const cancel = overlay.querySelector('[data-action="cancel"]');
  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    overlay.classList.add('is-open');
  });
  cancel.addEventListener('click', () => overlay.classList.remove('is-open'));
  proceed.addEventListener('click', () => { window.location.href = 'budget.html'; });
}

/* ---------------- Countdown timer ---------------- */
function initCountdown(targetISO){
  const els = {
    d: document.getElementById('cd-days'),
    h: document.getElementById('cd-hours'),
    m: document.getElementById('cd-mins'),
    s: document.getElementById('cd-secs'),
  };
  if(!els.d) return;
  const target = new Date(targetISO).getTime();
  function tick(){
    const diff = Math.max(0, target - Date.now());
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    els.d.textContent = String(d).padStart(2,'0');
    els.h.textContent = String(h).padStart(2,'0');
    els.m.textContent = String(m).padStart(2,'0');
    els.s.textContent = String(s).padStart(2,'0');
  }
  tick();
  setInterval(tick, 1000);
}

/* ---------------- Dashboard ---------------- */
function initDashboard(){
  const nameEl = document.getElementById('welcome-name');
  if(!nameEl) return;

  const user = ensureUser();
  nameEl.textContent = user.first_name;

  // Conditional hero CTA
  const ctaWrap = document.getElementById('hero-cta');
  if(ctaWrap){
    ctaWrap.innerHTML = user.payment_status
      ? `<a class="btn btn--primary" href="#">Join Live Session Now</a>`
      : `<a class="btn btn--urgent" href="#pay">Pay ₦5,000 to Unlock Live Access</a>`;
  }

  // Telegram gating
  const telegramCard = document.getElementById('telegram-card');
  if(telegramCard){
    telegramCard.classList.toggle('is-locked', !user.payment_status);
  }

  // Referral link + progress
  const refLink = document.getElementById('ref-link');
  const refCode = user.referral_code;
  if(refLink) refLink.textContent = `yourdomain.com/?ref=${refCode}`;

  const invites = user.invites || 0;
  const progressFill = document.getElementById('progress-fill');
  const progressCaption = document.getElementById('progress-caption');
  const pct = Math.min(100, (invites / 10) * 100);
  if(progressFill) progressFill.style.width = pct + '%';
  if(progressCaption) progressCaption.textContent = `You have invited ${invites} friend${invites===1?'':'s'}.`;

  // Guidebook unlocks
  const g1 = document.getElementById('guide-1');
  const g2 = document.getElementById('guide-2');
  if(g1) g1.classList.toggle('locked', invites < 3);
  if(g2) g2.classList.toggle('locked', invites < 10);
  const g1status = document.getElementById('guide-1-status');
  const g2status = document.getElementById('guide-2-status');
  if(g1status) g1status.textContent = invites >= 3 ? 'Unlocked — Download' : `Unlocks at 3 invites (${invites}/3)`;
  if(g2status) g2status.textContent = invites >= 10 ? 'Unlocked — Download' : `Unlocks at 10 invites (${invites}/10)`;

  // Share buttons
  const waBtn = document.getElementById('share-whatsapp');
  const twBtn = document.getElementById('share-twitter');
  const copyBtn = document.getElementById('share-copy');
  const link = `https://yourdomain.com/?ref=${refCode}`;
  const msg = `Hey! I just joined a 7-day No-Code training… Join me using my link: ${link}`;
  if(waBtn) waBtn.href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  if(twBtn) twBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`;
  if(copyBtn){
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(link);
      copyBtn.textContent = 'Link copied!';
      setTimeout(() => (copyBtn.textContent = 'Copy Link'), 1800);
    });
  }

  // Mini referral history (placeholder — TODO: GET /track-referral)
  const timeline = document.getElementById('referral-timeline');
  if(timeline){
    const demo = ['Blessing O. — 2 days ago','Tunde A. — 3 days ago','Faith E. — 4 days ago'];
    timeline.innerHTML = demo.map(t => `<li><span>${t.split(' — ')[0]}</span><span>${t.split(' — ')[1]}</span></li>`).join('');
  }

  // Leaderboard (placeholder — TODO: GET /leaderboard)
  const board = document.getElementById('leaderboard-body');
  if(board){
    const demo = [
      ['Chidi K.', 14], ['Amaka N.', 12], [`${user.first_name} ${user.last_name}`.trim(), invites],
      ['Samuel I.', 6], ['Grace U.', 5]
    ].sort((a,b)=>b[1]-a[1]).slice(0,10);
    board.innerHTML = demo.map((row,i) => `<tr><td>#${i+1}</td><td>${row[0]}</td><td>${row[1]}</td></tr>`).join('');
  }

  // Telegram anti-fraud email gate
  const telegramLink = document.getElementById('telegram-join-btn');
  const gateOverlay = document.getElementById('telegram-gate');
  if(telegramLink && gateOverlay){
    telegramLink.addEventListener('click', (e) => {
      if(!user.payment_status) return; // card already visually locked
      e.preventDefault();
      gateOverlay.classList.add('is-open');
    });
    const gateForm = document.getElementById('telegram-gate-form');
    gateForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      // TODO: POST email to backend, verify OTP, then reveal real invite URL
      gateOverlay.classList.remove('is-open');
      alert('Verified! (Placeholder) — the real invite link will open once the backend is connected.');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initSignupForm();
  initExitModal();
  initDashboard();
  // Live training start: Monday, Aug 24 2026, 7:00 PM WAT (GMT+1)
  initCountdown('2026-08-24T19:00:00+01:00');
});
