const SUPABASE_URL = 'https://nyanfbaosqshqiqvxesn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_L2uEZD5AX-AkKEuZ_YKQDw_6uH1FS6O';

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let articles = [];
let editingId = null;
let authMode = 'login';

const $ = (id) => document.getElementById(id);

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[c]));
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/* =========================
   ARTICLES
========================= */

function card(a) {
  const image =
    a.cover_url ||
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=700&q=80';

  return `
    <article class="card">
      <div class="card-img"
           style="background-image:url('${esc(image)}')"></div>

      <div class="card-body">
        <span class="tag">${esc(a.category || 'TRAINING')}</span>

        <h3>${esc(a.title)}</h3>

        <p class="card-excerpt">
          ${esc(a.excerpt || '')}
        </p>

        <div class="card-meta">
          <span>${formatDate(a.created_at)}</span>

          <a href="#"
             onclick="openArticle(${a.id}); return false;">
             READ MORE →
          </a>
        </div>
      </div>
    </article>
  `;
}

function renderArticles() {
  const cards = $('cards');
  const drawer = $('drawerArticles');

  if (cards) {
    cards.innerHTML = articles.length
      ? articles.slice(0, 4).map(card).join('')
      : '<p style="color:#888">No articles yet.</p>';
  }

  if (drawer) {
    drawer.innerHTML = articles.length
      ? articles.map(a => `
          <div class="drawer-item"
               onclick="openArticle(${a.id}); toggleDrawer();"
               style="cursor:pointer">

            <img
              src="${esc(a.cover_url || '')}"
              onerror="this.style.display='none'"
            >

            <div>
              <b>${esc(a.title)}</b>
              <small>
                ${formatDate(a.created_at)}
                ·
                ${esc(a.category || 'TRAINING')}
              </small>
            </div>
          </div>
        `).join('')
      : '<p style="color:#888">No articles yet.</p>';
  }
}

async function loadArticles() {
  const { data, error } = await db
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Articles error:', error);

    if ($('cards')) {
      $('cards').innerHTML =
        '<p style="color:#f66">Could not load articles.</p>';
    }

    return;
  }

  articles = data || [];

  renderArticles();
  renderAdminList();

  if ($('adminArticles')) {
    $('adminArticles').textContent = articles.length;
  }

  if ($('publicArticles')) {
    $('publicArticles').textContent = articles.length;
  }
}

/* =========================
   DRAWER
========================= */

function toggleDrawer() {
  const drawer = $('drawer');

  if (drawer) {
    drawer.classList.toggle('open');
  }
}

/* =========================
   AUTH
========================= */

function openAuth(mode = 'login') {
  authMode = mode;

  const auth = $('auth');

  if (!auth) {
    console.error('Auth modal not found');
    return;
  }

  auth.classList.remove('hidden');

  $('authTitle').textContent =
    mode === 'signup'
      ? 'CREATE ACCOUNT'
      : 'LOG IN';

  $('authSubmit').textContent =
    mode === 'signup'
      ? 'SIGN UP'
      : 'LOG IN';

  $('authSwitch').textContent =
    mode === 'signup'
      ? 'Already have an account? Log in'
      : "Don't have an account? Sign up";

  $('authMsg').textContent = '';

  $('authEmail').focus();
}

function closeAuth() {
  const auth = $('auth');

  if (auth) {
    auth.classList.add('hidden');
  }
}

function toggleAuthMode() {
  openAuth(
    authMode === 'login'
      ? 'signup'
      : 'login'
  );
}

async function handleAuth(e) {
  e.preventDefault();

  const email = $('authEmail').value.trim();
  const password = $('authPassword').value;

  $('authMsg').textContent = 'Please wait...';

  if (authMode === 'signup') {

    const { data, error } =
      await db.auth.signUp({
        email,
        password
      });

    if (error) {
      $('authMsg').textContent = error.message;
      return;
    }

    if (data.session) {
      $('authMsg').textContent =
        'Account created. You are now logged in.';

      setTimeout(closeAuth, 1000);
    } else {
      $('authMsg').textContent =
        'Account created. Check your email to confirm your account.';
    }

  } else {

    const { error } =
      await db.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      $('authMsg').textContent = error.message;
      return;
    }

    closeAuth();

    await updateUserUI();
  }
}

async function logout() {
  await db.auth.signOut();
  await updateUserUI();
}

/* =========================
   PROFILE / ADMIN
========================= */

async function getProfile(userId) {
  const { data, error } =
    await db
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

  if (error) {
    console.error('Profile error:', error);
    return null;
  }

  return data;
}

async function isAdmin() {
  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) return false;

  const profile =
    await getProfile(user.id);

  return profile?.role === 'admin';
}

async function updateUserUI() {
  const {
    data: { user }
  } = await db.auth.getUser();

  const loginBtn = $('loginBtn');
  const admin = $('admin');

  if (!user) {

    if (loginBtn) {
      loginBtn.textContent = 'LOG IN';
      loginBtn.onclick = () => openAuth('login');
    }

    if (admin) {
      admin.classList.add('hidden');
    }

    return;
  }

  const profile =
    await getProfile(user.id);

  if (loginBtn) {
    loginBtn.textContent = 'LOG OUT';
    loginBtn.onclick = logout;
  }

  if (profile?.role === 'admin') {

    if (admin) {
      admin.classList.remove('hidden');
    }

    await refreshAdminStats();

  } else {

    if (admin) {
      admin.classList.add('hidden');
    }
  }
}

/* =========================
   ADMIN STATS
========================= */

async function refreshAdminStats() {

  const { count: subs } =
    await db
      .from('subscribers')
      .select('*', {
        count: 'exact',
        head: true
      });

  const { data: stats } =
    await db
      .from('site_stats')
      .select('visits')
      .eq('id', 1)
      .maybeSingle();

  if ($('subs')) {
    $('subs').textContent = subs ?? 0;
  }

  if ($('adminArticles')) {
    $('adminArticles').textContent =
      articles.length;
  }

  if ($('visits')) {
    $('visits').textContent =
      stats?.visits ?? 0;
  }
}

/* =========================
   IMAGE UPLOAD
========================= */

async function uploadCoverImage(file) {

  if (!file) return null;

  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (!allowed.includes(file.type)) {
    throw new Error(
      'Please use JPG, PNG or WEBP.'
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error(
      'Image must be smaller than 5 MB.'
    );
  }

  const {
    data: { user }
  } = await db.auth.getUser();

  if (!user) {
    throw new Error(
      'You must be logged in.'
    );
  }

  const extension =
    file.name.split('.').pop().toLowerCase();

  const filename =
    `${user.id}/${crypto.randomUUID()}.${extension}`;

  const { error } =
    await db.storage
      .from('article-images')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

  if (error) {
    throw error;
  }

  const { data } =
    db.storage
      .from('article-images')
      .getPublicUrl(filename);

  return data.publicUrl;
}

function showCoverPreview(url) {

  if (!$('coverPreview') ||
      !$('coverPreviewImg')) {
    return;
  }

  if (!url) {
    $('coverPreview').classList.add('hidden');
    $('coverPreviewImg').src = '';
    return;
  }

  $('coverPreviewImg').src = url;
  $('coverPreview').classList.remove('hidden');
}

async function removeCoverImage() {

  const url =
    $('cover')?.value || '';

  if (!url) {
    showCoverPreview(null);
    return;
  }

  try {

    const marker =
      '/storage/v1/object/public/article-images/';

    const index =
      url.indexOf(marker);

    if (index !== -1) {

      const path =
        url.substring(
          index + marker.length
        );

      await db.storage
        .from('article-images')
        .remove([path]);
    }

  } catch (error) {
    console.warn(
      'Could not remove image from storage:',
      error
    );
  }

  if ($('cover')) {
    $('cover').value = '';
  }

  if ($('coverFile')) {
    $('coverFile').value = '';
  }

  showCoverPreview(null);
}

/* =========================
   SAVE ARTICLE
========================= */

async function saveArticle(e) {

  e.preventDefault();

  if (!(await isAdmin())) {
    $('articleMsg').textContent =
      'Admin access required.';
    return;
  }

  const button =
    $('articleSubmit');

  button.disabled = true;
  button.textContent = 'SAVING...';

  try {

    let coverUrl =
      $('cover').value.trim() || null;

    const file =
      $('coverFile')?.files?.[0];

    if (file) {

      $('articleMsg').textContent =
        'Uploading image...';

      coverUrl =
        await uploadCoverImage(file);
    }

    const payload = {
      title: $('title').value.trim(),
      excerpt: $('excerpt').value.trim(),
      content: $('content').value.trim(),
      cover_url: coverUrl,
      category: $('category').value
    };

    let result;

    if (editingId) {

      result =
        await db
          .from('articles')
          .update(payload)
          .eq('id', editingId);

    } else {

      const {
        data: { user }
      } = await db.auth.getUser();

      result =
        await db
          .from('articles')
          .insert({
            ...payload,
            author_id: user.id
          });
    }

    if (result.error) {
      throw result.error;
    }

    $('articleMsg').textContent =
      editingId
        ? 'Article updated successfully.'
        : 'Article published successfully.';

    editingId = null;

    $('articleForm').reset();

    $('cover').value = '';

    showCoverPreview(null);

    $('articleSubmit').textContent =
      'PUBLISH ARTICLE';

    await loadArticles();
    await refreshAdminStats();

  } catch (error) {

    console.error(error);

    $('articleMsg').textContent =
      error.message ||
      'Something went wrong.';
  }

  button.disabled = false;

  if (!editingId) {
    button.textContent =
      'PUBLISH ARTICLE';
  }
}

/* =========================
   EDIT ARTICLE
========================= */

function editArticle(id) {

  const article =
    articles.find(
      x => Number(x.id) === Number(id)
    );

  if (!article) return;

  editingId = article.id;

  $('title').value =
    article.title || '';

  $('category').value =
    article.category || 'TRAINING';

  $('cover').value =
    article.cover_url || '';

  $('excerpt').value =
    article.excerpt || '';

  $('content').value =
    article.content || '';

  showCoverPreview(
    article.cover_url || null
  );

  $('articleSubmit').textContent =
    'SAVE CHANGES';

  $('admin').scrollIntoView({
    behavior: 'smooth'
  });
}

/* =========================
   DELETE ARTICLE
========================= */

async function deleteArticle(id) {

  if (!(await isAdmin())) {
    alert('Admin access required.');
    return;
  }

  if (!confirm('Delete this article?')) {
    return;
  }

  const article =
    articles.find(
      x => Number(x.id) === Number(id)
    );

  const { error } =
    await db
      .from('articles')
      .delete()
      .eq('id', id);

  if (error) {
    alert(error.message);
    return;
  }

  if (article?.cover_url) {

    try {

      const marker =
        '/storage/v1/object/public/article-images/';

      const index =
        article.cover_url.indexOf(marker);

      if (index !== -1) {

        const path =
          article.cover_url.substring(
            index + marker.length
          );

        await db.storage
          .from('article-images')
          .remove([path]);
      }

    } catch (e) {
      console.warn(
        'Could not remove image:',
        e
      );
    }
  }

  await loadArticles();
  await refreshAdminStats();
}

/* =========================
   ADMIN LIST
========================= */

function renderAdminList() {

  const box =
    $('adminList');

  if (!box) return;

  box.innerHTML =
    articles.length
      ? articles.map(a => `
          <div class="admin-row">

            <div>
              <b>${esc(a.title)}</b>

              <small>
                ${formatDate(a.created_at)}
                ·
                ${esc(a.category || 'TRAINING')}
              </small>
            </div>

            <div>
              <button
                onclick="editArticle(${a.id})">
                EDIT
              </button>

              <button
                class="danger"
                onclick="deleteArticle(${a.id})">
                DELETE
              </button>
            </div>

          </div>
        `).join('')
      : '<p style="color:#888">No articles yet.</p>';
}

/* =========================
   SUBSCRIBE
========================= */

async function subscribe(e) {

  e.preventDefault();

  const email =
    e.target
      .querySelector('input[type=email]')
      .value
      .trim()
      .toLowerCase();

  const { error } =
    await db
      .from('subscribers')
      .insert({ email });

  if (
    error &&
    !String(error.message)
      .toLowerCase()
      .includes('duplicate')
  ) {

    e.target.innerHTML =
      `<b style="color:#ff6b6b">
        ${esc(error.message)}
      </b>`;

    return;
  }

  e.target.innerHTML =
    "<b style='color:#58c66a'>You're subscribed. Welcome to Fitness Fuel! 💪</b>";

  await refreshAdminStats();
}

/* =========================
   ARTICLE VIEW
========================= */

function openArticle(id) {

  const article =
    articles.find(
      x => Number(x.id) === Number(id)
    );

  if (!article) return;

  $('articleViewTitle').textContent =
    article.title;

  $('articleViewMeta').textContent =
    `${formatDate(article.created_at)} · ${article.category || 'TRAINING'}`;

  $('articleViewImage').src =
    article.cover_url ||
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80';

  $('articleViewContent').innerHTML =
    article.content || '';

  $('articleView').classList.remove(
    'hidden'
  );
}

function closeArticle() {

  $('articleView')
    .classList
    .add('hidden');
}

/* =========================
   EVENTS
========================= */

document.addEventListener(
  'DOMContentLoaded',
  () => {

    if ($('authForm')) {
      $('authForm')
        .addEventListener(
          'submit',
          handleAuth
        );
    }

    if ($('authSwitch')) {
      $('authSwitch')
        .addEventListener(
          'click',
          toggleAuthMode
        );
    }

    if ($('subscribe')) {
      $('subscribe')
        .addEventListener(
          'submit',
          subscribe
        );
    }

    if ($('articleForm')) {
      $('articleForm')
        .addEventListener(
          'submit',
          saveArticle
        );
    }

    if ($('coverFile')) {

      $('coverFile')
        .addEventListener(
          'change',
          () => {

            const file =
              $('coverFile').files[0];

            if (!file) return;

            const reader =
              new FileReader();

            reader.onload = () => {
              showCoverPreview(
                reader.result
              );
            };

            reader.readAsDataURL(file);
          }
        );
    }

    if ($('auth')) {

      $('auth')
        .addEventListener(
          'click',
          e => {

            if (
              e.target === $('auth')
            ) {
              closeAuth();
            }

          }
        );
    }

    if ($('articleView')) {

      $('articleView')
        .addEventListener(
          'click',
          e => {

            if (
              e.target ===
              $('articleView')
            ) {
              closeArticle();
            }

          }
        );
    }

    init();
  }
);

/* =========================
   AUTH STATE
========================= */

db.auth.onAuthStateChange(
  async () => {
    await updateUserUI();
  }
);

/* =========================
   INIT
========================= */

async function init() {

  await loadArticles();

  await trackVisit();

  await updateUserUI();
}

/* =========================
   VISIT TRACKING
========================= */

async function trackVisit() {

  try {

    await db.rpc(
      'track_page_view'
    );

  } catch (error) {

    console.warn(
      'Visit tracking failed:',
      error
    );
  }
}
