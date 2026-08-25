const SUPABASE_URL =
  'https://nyanfbaosqshqiqvxesn.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_L2uEZD5AX-AkKEuZ_YKQDw_6uH1FS6O';


const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


let articles = [];
let editingId = null;
let authMode = 'login';
let currentCoverUrl = '';



/* =========================
   HELPERS
========================= */

const $ = (id) => document.getElementById(id);


function esc(value = '') {

  return String(value).replace(
    /[&<>'"]/g,

    (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[c])
  );

}


function formatDate(value) {

  if (!value) return '';

  return new Date(value).toLocaleDateString(
    'en-US',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }
  );

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

      <div
        class="card-img"
        style="background-image:url('${esc(image)}')"
      ></div>

      <div class="card-body">

        <span class="tag">
          ${esc(a.category || 'TRAINING')}
        </span>

        <h3>
          ${esc(a.title)}
        </h3>

        <p class="card-excerpt">
          ${esc(a.excerpt || '')}
        </p>

        <div class="card-meta">

          <span>
            ${formatDate(a.created_at)}
          </span>

          <a
            href="#"
            onclick="openArticle(${a.id});return false;"
          >
            READ MORE →
          </a>

        </div>

      </div>

    </article>
  `;

}



function renderArticles() {

  const cards = $('cards');

  if (!cards) return;


  cards.innerHTML = articles.length

    ? articles
        .slice(0, 4)
        .map(card)
        .join('')

    : '<p style="color:#888">No articles yet.</p>';


  const drawer = $('drawerArticles');

  if (!drawer) return;


  drawer.innerHTML = articles.length

    ? articles.map(a => `

        <div
          class="drawer-item"
          onclick="openArticle(${a.id});toggleDrawer();"
          style="cursor:pointer"
        >

          <img
            src="${esc(a.cover_url || '')}"
            onerror="this.style.display='none'"
          >

          <div>

            <b>
              ${esc(a.title)}
            </b>

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



async function loadArticles() {

  const {
    data,
    error
  } = await db
    .from('articles')
    .select('*')
    .order('created_at', {
      ascending: false
    });


  if (error) {

    console.error(error);

    if ($('cards')) {

      $('cards').innerHTML =
        '<p style="color:#f66">Could not load articles.</p>';

    }

    return;

  }


  articles = data || [];

  renderArticles();

  if ($('adminArticles')) {

    $('adminArticles').textContent =
      articles.length;

  }

  if ($('publicArticles')) {

    $('publicArticles').textContent =
      articles.length;

  }


  renderAdminList();

}



/* =========================
   VISITS
========================= */

async function trackVisit() {

  try {

    await db.rpc('track_page_view');

  } catch (error) {

    console.warn(
      'Visit tracking failed',
      error
    );

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

function closeAuth() {

  $('auth').classList.add('hidden');

}


function openAuth(mode = 'login') {

  authMode = mode;

  $('auth').classList.remove('hidden');

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


  const email =
    $('authEmail').value.trim();

  const password =
    $('authPassword').value;


  $('authMsg').textContent =
    'Please wait...';


  if (authMode === 'signup') {

    const {
      data,
      error
    } = await db.auth.signUp({
      email,
      password
    });


    if (error) {

      $('authMsg').textContent =
        error.message;

      return;

    }


    if (data.session) {

      $('authMsg').textContent =
        'Account created. You are now logged in.';

    } else {

      $('authMsg').textContent =
        'Account created. Check your email to confirm your account, then log in.';

    }


  } else {

    const {
      error
    } = await db.auth.signInWithPassword({
      email,
      password
    });


    if (error) {

      $('authMsg').textContent =
        error.message;

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

  const {
    data,
    error
  } = await db
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();


  if (error) {

    console.error(
      'Profile error:',
      error
    );

  }


  return data;

}



async function isAdmin() {

  const {
    data: {
      user
    }
  } = await db.auth.getUser();


  if (!user) return false;


  const profile =
    await getProfile(user.id);


  return profile?.role === 'admin';

}



async function updateUserUI() {

  const {
    data: {
      user
    }
  } = await db.auth.getUser();


  const loginBtn =
    $('loginBtn');


  if (!user) {

    loginBtn.textContent =
      'LOG IN';

    loginBtn.onclick =
      () => openAuth('login');


    $('admin')
      .classList
      .add('hidden');


    return;

  }


  const profile =
    await getProfile(user.id);


  loginBtn.textContent =
    'LOG OUT';

  loginBtn.onclick =
    logout;


  if (profile?.role === 'admin') {

    $('admin')
      .classList
      .remove('hidden');


    await refreshAdminStats();

    renderAdminList();

  } else {

    $('admin')
      .classList
      .add('hidden');

  }

}



/* =========================
   ADMIN STATS
========================= */

async function refreshAdminStats() {

  const {
    count: subs
  } = await db
    .from('subscribers')
    .select('*', {
      count: 'exact',
      head: true
    });


  const {
    data: stats
  } = await db
    .from('site_stats')
    .select('visits')
    .eq('id', 1)
    .maybeSingle();


  $('subs').textContent =
    subs ?? 0;


  $('adminArticles').textContent =
    articles.length;


  $('visits').textContent =
    stats?.visits ?? 0;

}



/* =========================
   IMAGE UPLOAD
========================= */

async function uploadCoverImage(file) {

  if (!file) return null;


  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];


  if (!allowedTypes.includes(file.type)) {

    throw new Error(
      'Please upload a JPG, PNG or WEBP image.'
    );

  }


  if (file.size > 5 * 1024 * 1024) {

    throw new Error(
      'Image must be smaller than 5 MB.'
    );

  }


  const {
    data: {
      user
    }
  } = await db.auth.getUser();


  if (!user) {

    throw new Error(
      'You must be logged in.'
    );

  }


  const extension =
    file.name
      .split('.')
      .pop()
      .toLowerCase();


  const fileName =
    `${user.id}/${crypto.randomUUID()}.${extension}`;


  const {
    error
  } = await db
    .storage
    .from('article-images')
    .upload(
      fileName,
      file,
      {
        cacheControl: '3600',
        upsert: false
      }
    );


  if (error) {

    throw error;

  }


  const {
    data
  } = db
    .storage
    .from('article-images')
    .getPublicUrl(fileName);


  return data.publicUrl;

}



/* =========================
   IMAGE PREVIEW
========================= */

function showCoverPreview(url) {

  if (!url) return;


  currentCoverUrl = url;


  $('cover').value = url;


  $('coverPreviewImg').src =
    url;


  $('coverPreview')
    .classList
    .remove('hidden');

}



function removeCoverImage() {

  currentCoverUrl = '';

  $('cover').value = '';

  $('coverFile').value = '';

  $('coverPreviewImg').src = '';

  $('coverPreview')
    .classList
    .add('hidden');

}



/* =========================
   SAVE ARTICLE
========================= */

async function saveArticle(e) {

  e.preventDefault();


  $('articleMsg').textContent =
    'Saving article...';


  if (!(await isAdmin())) {

    $('articleMsg').textContent =
      'Admin access required.';

    return;

  }


  try {

    const file =
      $('coverFile').files[0];


    let coverUrl =
      currentCoverUrl ||
      $('cover').value.trim() ||
      null;


    /*
      If a NEW image was selected,
      upload it first.
    */

    if (file) {

      $('articleMsg').textContent =
        'Uploading image...';


      coverUrl =
        await uploadCoverImage(file);

    }


    const payload = {

      title:
        $('title').value.trim(),

      excerpt:
        $('excerpt').value.trim(),

      content:
        $('content').value.trim(),

      cover_url:
        coverUrl,

      category:
        $('category').value

    };


    let result;


    /* EDIT */

    if (editingId) {

      result =
        await db
          .from('articles')
          .update(payload)
          .eq('id', editingId);

    }


    /* NEW ARTICLE */

    else {

      const {
        data: {
          user
        }
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

    clearArticleForm();


    await loadArticles();

    await refreshAdminStats();

  } catch (error) {

    console.error(error);

    $('articleMsg').textContent =
      error.message ||
      'Something went wrong.';

  }

}



/* =========================
   CLEAR ARTICLE FORM
========================= */

function clearArticleForm() {

  $('articleForm').reset();

  editingId = null;

  currentCoverUrl = '';

  $('cover').value = '';

  $('coverFile').value = '';

  $('coverPreviewImg').src = '';

  $('coverPreview')
    .classList
    .add('hidden');


  $('articleSubmit').textContent =
    'PUBLISH ARTICLE';

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


  editingId =
    article.id;


  $('title').value =
    article.title || '';


  $('category').value =
    article.category || 'TRAINING';


  $('excerpt').value =
    article.excerpt || '';


  $('content').value =
    article.content || '';


  currentCoverUrl =
    article.cover_url || '';


  $('cover').value =
    article.cover_url || '';


  if (article.cover_url) {

    showCoverPreview(
      article.cover_url
    );

  } else {

    removeCoverImage();

  }


  $('articleSubmit').textContent =
    'SAVE CHANGES';


  $('articleMsg').textContent =
    'Editing article.';


  $('admin')
    .scrollIntoView({
      behavior: 'smooth'
    });

}



/* =========================
   DELETE ARTICLE
========================= */

async function deleteArticle(id) {

  if (!(await isAdmin())) {

    alert(
      'Admin access required.'
    );

    return;

  }


  const article =
    articles.find(
      x => Number(x.id) === Number(id)
    );


  if (!article) return;


  if (
    !confirm(
      `Delete "${article.title}"?`
    )
  ) {

    return;

  }


  const {
    error
  } = await db
    .from('articles')
    .delete()
    .eq('id', id);


  if (error) {

    alert(error.message);

    return;

  }


  await loadArticles();

  await refreshAdminStats();

}



/* =========================
   ADMIN ARTICLE LIST
========================= */

function renderAdminList() {

  const box =
    $('adminList');


  if (!box) return;


  if (!articles.length) {

    box.innerHTML =
      '<p style="color:#888">No articles yet.</p>';

    return;

  }


  box.innerHTML =
    articles.map(a => `

      <div class="admin-row">

        <div>

          <b>
            ${esc(a.title)}
          </b>

          <small>
            ${formatDate(a.created_at)}
            ·
            ${esc(a.category || 'TRAINING')}
          </small>

        </div>


        <div>

          <button
            onclick="editArticle(${a.id})"
          >
            EDIT
          </button>

          <button
            class="danger"
            onclick="deleteArticle(${a.id})"
          >
            DELETE
          </button>

        </div>

      </div>

    `).join('');

}



/* =========================
   NEWSLETTER
========================= */

async function subscribe(e) {

  e.preventDefault();


  const email =
    e.target
      .querySelector('input[type=email]')
      .value
      .trim()
      .toLowerCase();


  const {
    error
  } = await db
    .from('subscribers')
    .insert({
      email
    });


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
    `<b style="color:#58c66a">
      You're subscribed.
      Welcome to Fitness Fuel! 💪
    </b>`;


  await refreshAdminStats();

}



/* =========================
   OPEN ARTICLE
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


  /*
    The article content can contain
    basic HTML.
  */

  $('articleViewContent').innerHTML =
    article.content || '';


  $('articleView')
    .classList
    .remove('hidden');

}



function closeArticle() {

  $('articleView')
    .classList
    .add('hidden');

}



/* =========================
   IMAGE FILE SELECT
========================= */

function handleCoverFileChange() {

  const file =
    $('coverFile').files[0];


  if (!file) return;


  const temporaryUrl =
    URL.createObjectURL(file);


  showCoverPreview(
    temporaryUrl
  );


  $('articleMsg').textContent =
    'Image selected. It will be uploaded when you publish the article.';

}



/* =========================
   EVENTS
========================= */

$('authForm')
  .addEventListener(
    'submit',
    handleAuth
  );


$('authSwitch')
  .addEventListener(
    'click',
    toggleAuthMode
  );


$('subscribe')
  .addEventListener(
    'submit',
    subscribe
  );


$('articleForm')
  .addEventListener(
    'submit',
    saveArticle
  );


$('coverFile')
  .addEventListener(
    'change',
    handleCoverFileChange
  );


$('clearArticleBtn')
  .addEventListener(
    'click',
    clearArticleForm
  );


$('auth')
  .addEventListener(
    'click',
    (e) => {

      if (
        e.target === $('auth')
      ) {

        closeAuth();

      }

    }
  );


$('articleView')
  .addEventListener(
    'click',
    (e) => {

      if (
        e.target === $('articleView')
      ) {

        closeArticle();

      }

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
   START
========================= */

(async function init() {

  await loadArticles();

  await trackVisit();

  await updateUserUI();

})();
        <h3>${esc(a.title)}</h3>

        <p class="card-excerpt">
          ${esc(a.excerpt || '')}
        </p>

        <div class="card-meta">
          <span>${formatDate(a.created_at)}</span>

          <a
            href="#"
            onclick="openArticle(${a.id});return false;"
          >
            READ MORE →
          </a>
        </div>
      </div>
    </article>
  `;
}

function renderArticles() {
  $('cards').innerHTML = articles.length
    ? articles.slice(0, 4).map(card).join('')
    : '<p style="color:#888">No articles yet.</p>';

  $('drawerArticles').innerHTML = articles.length
    ? articles.map(a => `
        <div
          class="drawer-item"
          onclick="openArticle(${a.id});toggleDrawer();"
          style="cursor:pointer"
        >
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

async function loadArticles() {
  const {
    data,
    error
  } = await db
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);

    $('cards').innerHTML =
      '<p style="color:#f66">Could not load articles. Check Supabase settings.</p>';

    return;
  }

  articles = data || [];

  renderArticles();

  if ($('adminArticles')) {
    $('adminArticles').textContent = articles.length;
  }

  if ($('publicArticles')) {
    $('publicArticles').textContent = articles.length;
  }

  renderAdminList();
}

/* =========================
   VISITS
========================= */

async function trackVisit() {
  try {
    await db.rpc('track_page_view');
  } catch (e) {
    console.warn('Visit tracking failed', e);
  }
}

/* =========================
   DRAWER
========================= */

function toggleDrawer() {
  $('drawer').classList.toggle('open');
}

/* =========================
   AUTHENTICATION
========================= */

function closeAuth() {
  $('auth').classList.add('hidden');
}

function openAuth(mode = 'login') {
  authMode = mode;

  $('auth').classList.remove('hidden');

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
    const {
      data,
      error
    } = await db.auth.signUp({
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
    } else {
      $('authMsg').textContent =
        'Account created. Check your email to confirm your account, then log in.';
    }

  } else {
    const {
      error
    } = await db.auth.signInWithPassword({
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
   PROFILES / ADMIN
========================= */

async function getProfile(userId) {
  const {
    data
  } = await db
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  return data;
}

async function isAdmin() {
  const {
    data: {
      user
    }
  } = await db.auth.getUser();

  if (!user) return false;

  const profile = await getProfile(user.id);

  return profile?.role === 'admin';
}

async function updateUserUI() {
  const {
    data: {
      user
    }
  } = await db.auth.getUser();

  const loginBtn = $('loginBtn');

  if (!user) {
    loginBtn.textContent = 'LOG IN';

    loginBtn.onclick = () =>
      openAuth('login');

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
  const {
    count: subs
  } = await db
    .from('subscribers')
    .select('*', {
      count: 'exact',
      head: true
    });

  const {
    data: stats
  } = await db
    .from('site_stats')
    .select('visits')
    .eq('id', 1)
    .maybeSingle();

  $('subs').textContent = subs ?? 0;

  $('adminArticles').textContent =
    articles.length;

  $('visits').textContent =
    stats?.visits ?? 0;
}

/* =========================
   IMAGE UPLOAD
========================= */

async function uploadCoverImage(file) {
  if (!file) return null;

  const {
    data: {
      user
    }
  } = await db.auth.getUser();

  if (!user) {
    throw new Error('You must be logged in.');
  }

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      'Please select a JPG, PNG or WebP image.'
    );
  }

  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error(
      'Image must be smaller than 5 MB.'
    );
  }

  const extension =
    file.name
      .split('.')
      .pop()
      .toLowerCase();

  const fileName =
    `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const {
    error
  } = await db.storage
    .from('article-images')
    .upload(
      fileName,
      file,
      {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      }
    );

  if (error) {
    throw error;
  }

  const {
    data
  } = db.storage
    .from('article-images')
    .getPublicUrl(fileName);

  return {
    url: data.publicUrl,
    path: fileName
  };
}

async function deleteCoverImage(url) {
  if (!url) return;

  if (!url.includes('/article-images/')) {
    return;
  }

  const marker = '/article-images/';

  const path =
    url.split(marker)[1];

  if (!path) return;

  const {
    error
  } = await db.storage
    .from('article-images')
    .remove([
      decodeURIComponent(path)
    ]);

  if (error) {
    console.warn(
      'Could not delete image:',
      error
    );
  }
}

function previewCoverImage(file) {
  if (!file) return;

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (!allowedTypes.includes(file.type)) {
    alert(
      'Please select a JPG, PNG or WebP image.'
    );

    $('coverFile').value = '';

    return;
  }

  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    alert(
      'Image must be smaller than 5 MB.'
    );

    $('coverFile').value = '';

    return;
  }

  const reader =
    new FileReader();

  reader.onload = (e) => {
    $('coverPreviewImg').src =
      e.target.result;

    $('coverPreview')
      .classList
      .remove('hidden');
  };

  reader.readAsDataURL(file);
}

async function removeCoverImage() {
  const currentUrl =
    $('cover').value.trim();

  if (currentUrl) {
    await deleteCoverImage(
      currentUrl
    );
  }

  $('cover').value = '';

  $('coverFile').value = '';

  $('coverPreviewImg').src = '';

  $('coverPreview')
    .classList
    .add('hidden');

  $('articleMsg').textContent =
    'Cover image removed.';
}

/* =========================
   SAVE / CREATE / UPDATE
========================= */

async function saveArticle(e) {
  e.preventDefault();

  if (!(await isAdmin())) {
    $('articleMsg').textContent =
      'Admin access required.';

    return;
  }

  const file =
    $('coverFile').files[0];

  const oldCoverUrl =
    $('cover').value.trim() || null;

  try {
    $('articleMsg').textContent =
      file
        ? 'Uploading image...'
        : 'Saving article...';

    let coverUrl =
      oldCoverUrl;

    /* Upload new image */

    if (file) {
      const uploaded =
        await uploadCoverImage(file);

      coverUrl =
        uploaded.url;
    }

    const payload = {
      title:
        $('title').value.trim(),

      excerpt:
        $('excerpt').value.trim(),

      content:
        $('content').value.trim(),

      cover_url:
        coverUrl,

      category:
        $('category').value
    };

    let result;

    /* UPDATE */

    if (editingId) {

      result =
        await db
          .from('articles')
          .update(payload)
          .eq('id', editingId);

      if (
        !result.error &&
        file &&
        oldCoverUrl &&
        oldCoverUrl !== coverUrl
      ) {
        await deleteCoverImage(
          oldCoverUrl
        );
      }

    }

    /* CREATE */

    else {

      const {
        data: {
          user
        }
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
      $('articleMsg').textContent =
        result.error.message;

      return;
    }

    $('articleMsg').textContent =
      editingId
        ? 'Article updated.'
        : 'Article published.';

    editingId = null;

    $('articleForm').reset();

    $('cover').value = '';

    $('coverPreviewImg').src = '';

    $('coverPreview')
      .classList
      .add('hidden');

    $('articleSubmit').textContent =
      'PUBLISH ARTICLE';

    await loadArticles();

    await refreshAdminStats();

    renderAdminList();

  } catch (error) {

    console.error(error);

    $('articleMsg').textContent =
      error.message ||
      'Could not upload image.';
  }
}

/* =========================
   DELETE ARTICLE
========================= */

async function deleteArticle(id) {
  if (!(await isAdmin())) {
    return alert(
      'Admin access required.'
    );
  }

  if (
    !confirm(
      'Delete this article?'
    )
  ) {
    return;
  }

  const article =
    articles.find(
      x =>
        Number(x.id) ===
        Number(id)
    );

  const {
    error
  } = await db
    .from('articles')
    .delete()
    .eq('id', id);

  if (error) {
    return alert(
      error.message
    );
  }

  /* Delete cover image too */

  if (article?.cover_url) {
    await deleteCoverImage(
      article.cover_url
    );
  }

  await loadArticles();

  await refreshAdminStats();

  renderAdminList();
}

/* =========================
   EDIT ARTICLE
========================= */

function editArticle(id) {
  const a =
    articles.find(
      x =>
        Number(x.id) ===
        Number(id)
    );

  if (!a) return;

  editingId = a.id;

  $('title').value =
    a.title || '';

  $('category').value =
    a.category || 'TRAINING';

  $('cover').value =
    a.cover_url || '';

  $('excerpt').value =
    a.excerpt || '';

  $('content').value =
    a.content || '';

  $('coverFile').value = '';

  if (a.cover_url) {

    $('coverPreviewImg').src =
      a.cover_url;

    $('coverPreview')
      .classList
      .remove('hidden');

  } else {

    $('coverPreviewImg').src = '';

    $('coverPreview')
      .classList
      .add('hidden');
  }

  $('articleSubmit').textContent =
    'SAVE CHANGES';

  $('articleMsg').textContent = '';

  $('admin').scrollIntoView({
    behavior: 'smooth'
  });
}

/* =========================
   CLEAR ARTICLE FORM
========================= */

function clearArticleForm() {
  editingId = null;

  $('articleForm').reset();

  $('cover').value = '';

  $('coverFile').value = '';

  $('coverPreviewImg').src = '';

  $('coverPreview')
    .classList
    .add('hidden');

  $('articleSubmit').textContent =
    'PUBLISH ARTICLE';

  $('articleMsg').textContent = '';
}

/* =========================
   ADMIN ARTICLE LIST
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
                onclick="editArticle(${a.id})"
              >
                EDIT
              </button>

              <button
                class="danger"
                onclick="deleteArticle(${a.id})"
              >
                DELETE
              </button>
            </div>

          </div>
        `).join('')
      : '<p style="color:#888">No articles yet.</p>';
}

/* =========================
   NEWSLETTER
========================= */

async function subscribe(e) {
  e.preventDefault();

  const email =
    e.target
      .querySelector('input[type=email]')
      .value
      .trim()
      .toLowerCase();

  const {
    error
  } = await db
    .from('subscribers')
    .insert({
      email
    });

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
   OPEN ARTICLE
========================= */

function openArticle(id) {
  const a =
    articles.find(
      x =>
        Number(x.id) ===
        Number(id)
    );

  if (!a) return;

  $('articleViewTitle').textContent =
    a.title;

  $('articleViewMeta').textContent =
    `${formatDate(a.created_at)} · ${a.category || 'TRAINING'}`;

  $('articleViewImage').src =
    a.cover_url ||
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80';

  $('articleViewContent').innerHTML =
    a.content || '';

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
   EVENT LISTENERS
========================= */

$('authForm')
  .addEventListener(
    'submit',
    handleAuth
  );

$('authSwitch')
  .addEventListener(
    'click',
    toggleAuthMode
  );

$('subscribe')
  .addEventListener(
    'submit',
    subscribe
  );

$('articleForm')
  .addEventListener(
    'submit',
    saveArticle
  );

$('coverFile')
  .addEventListener(
    'change',
    (e) => {
      previewCoverImage(
        e.target.files[0]
      );
    }
  );

$('auth')
  .addEventListener(
    'click',
    (e) => {
      if (
        e.target === $('auth')
      ) {
        closeAuth();
      }
    }
  );

$('articleView')
  .addEventListener(
    'click',
    (e) => {
      if (
        e.target ===
        $('articleView')
      ) {
        closeArticle();
      }
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
   INITIALIZE
========================= */

(async function init() {

  await loadArticles();

  renderAdminList();

  await trackVisit();

  await updateUserUI();

})();
