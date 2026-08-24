const SUPABASE_URL = 'https://nyamfbaosqshqiqvxesn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_L2uEZD5AX-AkKEuZ_YKQDw_6uH1FS6O';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let articles = [];
let editingId = null;
let authMode = 'login';

const $ = (id) => document.getElementById(id);

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric'});
}

function card(a) {
  const image = a.cover_url || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=700&q=80';
  return `<article class="card">
    <div class="card-img" style="background-image:url('${esc(image)}')"></div>
    <div class="card-body">
      <span class="tag">${esc(a.category || 'TRAINING')}</span>
      <h3>${esc(a.title)}</h3>
      <p class="card-excerpt">${esc(a.excerpt || '')}</p>
      <div class="card-meta"><span>${formatDate(a.created_at)}</span><a href="#" onclick="openArticle(${a.id});return false;">READ MORE →</a></div>
    </div>
  </article>`;
}

function renderArticles() {
  $('cards').innerHTML = articles.length
    ? articles.slice(0, 4).map(card).join('')
    : '<p style="color:#888">No articles yet.</p>';

  $('drawerArticles').innerHTML = articles.length
    ? articles.map(a => `<div class="drawer-item"><img src="${esc(a.cover_url || '')}" onerror="this.style.display='none'"><div><b>${esc(a.title)}</b><small>${formatDate(a.created_at)} · ${esc(a.category || 'TRAINING')}</small></div></div>`).join('')
    : '<p style="color:#888">No articles yet.</p>';
}

async function loadArticles() {
  const { data, error } = await db.from('articles').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    $('cards').innerHTML = '<p style="color:#f66">Could not load articles. Check Supabase settings.</p>';
    return;
  }
  articles = data || [];
  renderArticles();
  if ($('adminArticles')) $('adminArticles').textContent = articles.length;
  if ($('publicArticles')) $('publicArticles').textContent = articles.length;
}

async function trackVisit() {
  try { await db.rpc('track_page_view'); } catch (e) { console.warn('Visit tracking failed', e); }
}

function toggleDrawer() { $('drawer').classList.toggle('open'); }
function closeAuth() { $('auth').classList.add('hidden'); }
function openAuth(mode = 'login') {
  authMode = mode;
  $('auth').classList.remove('hidden');
  $('authTitle').textContent = mode === 'signup' ? 'CREATE ACCOUNT' : 'LOG IN';
  $('authSubmit').textContent = mode === 'signup' ? 'SIGN UP' : 'LOG IN';
  $('authSwitch').textContent = mode === 'signup' ? 'Already have an account? Log in' : "Don't have an account? Sign up";
  $('authMsg').textContent = '';
}
function toggleAuthMode() { openAuth(authMode === 'login' ? 'signup' : 'login'); }

async function handleAuth(e) {
  e.preventDefault();
  const email = $('authEmail').value.trim();
  const password = $('authPassword').value;
  $('authMsg').textContent = 'Please wait...';

  if (authMode === 'signup') {
    const { data, error } = await db.auth.signUp({ email, password });
    if (error) { $('authMsg').textContent = error.message; return; }
    if (data.session) {
      $('authMsg').textContent = 'Account created. You are now logged in.';
    } else {
      $('authMsg').textContent = 'Account created. Check your email to confirm your account, then log in.';
    }
  } else {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) { $('authMsg').textContent = error.message; return; }
    closeAuth();
    await updateUserUI();
  }
}

async function logout() {
  await db.auth.signOut();
  await updateUserUI();
}

async function getProfile(userId) {
  const { data } = await db.from('profiles').select('role').eq('id', userId).maybeSingle();
  return data;
}

async function updateUserUI() {
  const { data: { user } } = await db.auth.getUser();
  const loginBtn = $('loginBtn');
  if (!user) {
    loginBtn.textContent = 'LOG IN';
    loginBtn.onclick = () => openAuth('login');
    $('admin').classList.add('hidden');
    return;
  }

  const profile = await getProfile(user.id);
  loginBtn.textContent = 'LOG OUT';
  loginBtn.onclick = logout;
  if (profile?.role === 'admin') {
    $('admin').classList.remove('hidden');
    await refreshAdminStats();
  } else {
    $('admin').classList.add('hidden');
  }
}

async function refreshAdminStats() {
  const { count: subs } = await db.from('subscribers').select('*', { count: 'exact', head: true });
  const { data: stats } = await db.from('site_stats').select('visits').eq('id', 1).maybeSingle();
  $('subs').textContent = subs ?? 0;
  $('adminArticles').textContent = articles.length;
  $('visits').textContent = stats?.visits ?? 0;
}

async function isAdmin() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return false;
  const profile = await getProfile(user.id);
  return profile?.role === 'admin';
}

async function saveArticle(e) {
  e.preventDefault();
  if (!(await isAdmin())) { $('articleMsg').textContent = 'Admin access required.'; return; }

  const payload = {
    title: $('title').value.trim(),
    excerpt: $('excerpt').value.trim(),
    content: $('content').value.trim(),
    cover_url: $('cover').value.trim() || null,
    category: $('category').value
  };

  let result;
  if (editingId) {
    result = await db.from('articles').update(payload).eq('id', editingId);
  } else {
    const { data: { user } } = await db.auth.getUser();
    result = await db.from('articles').insert({...payload, author_id: user.id});
  }

  if (result.error) { $('articleMsg').textContent = result.error.message; return; }
  $('articleMsg').textContent = editingId ? 'Article updated.' : 'Article published.';
  editingId = null;
  $('articleForm').reset();
  $('articleSubmit').textContent = 'PUBLISH ARTICLE';
  await loadArticles();
  await refreshAdminStats();
}

async function deleteArticle(id) {
  if (!(await isAdmin())) return alert('Admin access required.');
  if (!confirm('Delete this article?')) return;
  const { error } = await db.from('articles').delete().eq('id', id);
  if (error) return alert(error.message);
  await loadArticles();
  await refreshAdminStats();
  renderAdminList();
}

function editArticle(id) {
  const a = articles.find(x => Number(x.id) === Number(id));
  if (!a) return;
  editingId = a.id;
  $('title').value = a.title || '';
  $('category').value = a.category || 'TRAINING';
  $('cover').value = a.cover_url || '';
  $('excerpt').value = a.excerpt || '';
  $('content').value = a.content || '';
  $('articleSubmit').textContent = 'SAVE CHANGES';
  $('admin').scrollIntoView({behavior:'smooth'});
}

function renderAdminList() {
  const box = $('adminList');
  if (!box) return;
  box.innerHTML = articles.length ? articles.map(a => `<div class="admin-row">
    <div><b>${esc(a.title)}</b><small>${formatDate(a.created_at)} · ${esc(a.category || 'TRAINING')}</small></div>
    <div><button onclick="editArticle(${a.id})">EDIT</button><button class="danger" onclick="deleteArticle(${a.id})">DELETE</button></div>
  </div>`).join('') : '<p style="color:#888">No articles yet.</p>';
}

async function subscribe(e) {
  e.preventDefault();
  const email = e.target.querySelector('input[type=email]').value.trim().toLowerCase();
  const { error } = await db.from('subscribers').insert({ email });
  if (error && !String(error.message).toLowerCase().includes('duplicate')) {
    e.target.innerHTML = `<b style="color:#ff6b6b">${esc(error.message)}</b>`;
    return;
  }
  e.target.innerHTML = "<b style='color:#58c66a'>You're subscribed. Welcome to Fitness Fuel! 💪</b>";
  await refreshAdminStats();
}

function openArticle(id) {
  const a = articles.find(x => Number(x.id) === Number(id));
  if (!a) return;
  $('articleViewTitle').textContent = a.title;
  $('articleViewMeta').textContent = `${formatDate(a.created_at)} · ${a.category || 'TRAINING'}`;
  $('articleViewImage').src = a.cover_url || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80';
  $('articleViewContent').innerHTML = a.content || '';
  $('articleView').classList.remove('hidden');
}
function closeArticle() { $('articleView').classList.add('hidden'); }

$('authForm').addEventListener('submit', handleAuth);
$('authSwitch').addEventListener('click', toggleAuthMode);
$('subscribe').addEventListener('submit', subscribe);
$('articleForm').addEventListener('submit', saveArticle);

$('auth').addEventListener('click', (e) => { if (e.target === $('auth')) closeAuth(); });
$('articleView').addEventListener('click', (e) => { if (e.target === $('articleView')) closeArticle(); });

db.auth.onAuthStateChange(async () => { await updateUserUI(); });

(async function init() {
  await loadArticles();
  renderAdminList();
  await trackVisit();
  await updateUserUI();
})();
