const SUPABASE_URL =
  'https://nyanfbaosqshqiqvxesn.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_L2uEZD5AX-AkKEuZ_YKQDw_6uH1FS6O';


let db = null;

let articles = [];

let editingId = null;

let authMode = 'login';

let currentCategory = 'ALL';

let currentArticleId = null;


/* =====================================================
   HELPERS
===================================================== */

const $ = id =>
  document.getElementById(id);


function esc(value = '') {

  return String(value).replace(
    /[&<>'"]/g,
    char => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      "'":'&#39;',
      '"':'&quot;'
    }[char])
  );
}


function formatDate(value) {

  if (!value) return '';

  return new Date(value).toLocaleDateString(
    'cs-CZ',
    {
      year:'numeric',
      month:'short',
      day:'numeric'
    }
  );
}


function getImage(article, large = false) {

  return (
    article.cover_url ||
    (
      large
        ? 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1400&q=85'
        : 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80'
    )
  );
}


/* =====================================================
   SUPABASE
===================================================== */

function initSupabase() {

  if (!window.supabase) {

    console.error(
      'Supabase knihovna nebyla načtena.'
    );

    return false;
  }

  db =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );

  return true;
}


/* =====================================================
   SEARCH
===================================================== */

function setupSearch() {

  const button =
    $('searchBtn');

  const input =
    $('searchInput');

  const close =
    $('searchClose');

  const overlay =
    $('searchOverlay');

  if (!button || !input || !close || !overlay) {
    return;
  }

  button.addEventListener(
    'click',
    openSearch
  );

  close.addEventListener(
    'click',
    closeSearch
  );

  input.addEventListener(
    'input',
    () => {

      showSearchResults(
        input.value
      );

    }
  );

  input.addEventListener(
    'keydown',
    event => {

      if (event.key === 'Escape') {
        closeSearch();
      }

    }
  );

  overlay.addEventListener(
    'click',
    event => {

      if (
        event.target === overlay
      ) {
        closeSearch();
      }

    }
  );

}


function openSearch() {

  const overlay =
    $('searchOverlay');

  const input =
    $('searchInput');

  if (!overlay || !input) return;

  overlay.classList.remove('hidden');

  document.body.classList.add(
    'no-scroll'
  );

  setTimeout(
    () => input.focus(),
    50
  );
}


function closeSearch() {

  const overlay =
    $('searchOverlay');

  const input =
    $('searchInput');

  const results =
    $('searchResults');

  if (!overlay) return;

  overlay.classList.add('hidden');

  document.body.classList.remove(
    'no-scroll'
  );

  if (input) {
    input.value = '';
  }

  if (results) {
    results.innerHTML = '';
    results.classList.add('hidden');
  }

}


function showSearchResults(value = '') {

  const results =
    $('searchResults');

  if (!results) return;

  const query =
    value.trim().toLowerCase();

  if (!query) {

    results.innerHTML = '';

    results.classList.add(
      'hidden'
    );

    return;
  }

  const filtered =
    articles.filter(article => {

      const title =
        String(
          article.title || ''
        ).toLowerCase();

      const excerpt =
        String(
          article.excerpt || ''
        ).toLowerCase();

      const category =
        String(
          article.category || ''
        ).toLowerCase();

      return (
        title.includes(query) ||
        excerpt.includes(query) ||
        category.includes(query)
      );

    });


  if (!filtered.length) {

    results.innerHTML = `
      <div class="no-results">
        <strong>Nic jsme nenašli</strong>
        <span>Zkuste jiné slovo.</span>
      </div>
    `;

    results.classList.remove(
      'hidden'
    );

    return;
  }


  results.innerHTML =
    filtered
      .map(article => `

        <div
          class="search-result"
          data-id="${article.id}">

          <img
            src="${esc(getImage(article))}"
            alt="">

          <div>

            <strong>
              ${esc(article.title)}
            </strong>

            <small>
              ${esc(article.category || 'POHYB')}
              ·
              ${formatDate(article.created_at)}
            </small>

          </div>

        </div>

      `)
      .join('');


  results
    .querySelectorAll(
      '.search-result'
    )
    .forEach(item => {

      item.addEventListener(
        'click',
        () => {

          openArticle(
            Number(
              item.dataset.id
            )
          );

          closeSearch();

        }
      );

    });


  results.classList.remove(
    'hidden'
  );

}


/* =====================================================
   AUTH
===================================================== */

function openAuth(mode = 'login') {

  authMode = mode;

  const auth =
    $('auth');

  if (!auth) return;

  auth.classList.remove(
    'hidden'
  );

  $('authTitle').textContent =
    mode === 'signup'
      ? 'VYTVOŘIT ÚČET'
      : 'PŘIHLÁSIT SE';

  $('authSubmit').textContent =
    mode === 'signup'
      ? 'VYTVOŘIT ÚČET'
      : 'PŘIHLÁSIT SE';

  $('authSwitch').textContent =
    mode === 'signup'
      ? 'Už máte účet? Přihlaste se'
      : 'Nemáte účet? Vytvořte si ho';

  $('authMsg').textContent = '';

  setTimeout(
    () => $('authEmail')?.focus(),
    50
  );

}


function closeAuth() {

  $('auth')?.classList.add(
    'hidden'
  );

}


function toggleAuthMode() {

  openAuth(
    authMode === 'login'
      ? 'signup'
      : 'login'
  );

}


async function handleAuth(event) {

  event.preventDefault();

  const msg =
    $('authMsg');

  if (!db) {

    msg.textContent =
      'Spojení se serverem není dostupné.';

    return;
  }


  const email =
    $('authEmail')
      .value
      .trim();

  const password =
    $('authPassword')
      .value;


  if (!email || !password) {

    msg.textContent =
      'Vyplňte e-mail a heslo.';

    return;
  }


  msg.textContent =
    'Pracuji...';


  try {

    if (authMode === 'signup') {

      const {
        data,
        error
      } =
        await db.auth.signUp({
          email,
          password
        });


      if (error) {

        msg.textContent =
          error.message;

        return;
      }


      if (data.session) {

        msg.textContent =
          'Účet byl vytvořen.';

        setTimeout(
          async () => {

            closeAuth();

            await updateUserUI();

          },
          700
        );

      } else {

        msg.textContent =
          'Účet byl vytvořen. Zkontrolujte e-mail a potvrďte registraci.';

      }

      return;
    }


    const {
      error
    } =
      await db.auth.signInWithPassword({
        email,
        password
      });


    if (error) {

      msg.textContent =
        error.message;

      return;
    }


    closeAuth();

    await updateUserUI();


  } catch (error) {

    console.error(
      'Auth error:',
      error
    );

    msg.textContent =
      error.message ||
      'Přihlášení se nepodařilo.';

  }

}


async function logout() {

  if (!db) return;

  await db.auth.signOut();

  await updateUserUI();

}


/* =====================================================
   PROFILE / ADMIN
===================================================== */

async function getProfile(userId) {

  if (!db || !userId) {
    return null;
  }

  const {
    data,
    error
  } =
    await db
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();


  if (error) {

    console.error(
      'Profil error:',
      error
    );

    return null;
  }


  return data;

}


async function isAdmin() {

  if (!db) return false;

  const {
    data:{
      user
    }
  } =
    await db.auth.getUser();


  if (!user) return false;


  const profile =
    await getProfile(
      user.id
    );


  return profile?.role === 'admin';

}


async function updateUserUI() {

  if (!db) return;

  try {

    const {
      data:{
        user
      }
    } =
      await db.auth.getUser();


    const loginBtn =
      $('loginBtn');

    const admin =
      $('admin');


    if (!user) {

      if (loginBtn) {

        loginBtn.textContent =
          'PŘIHLÁSIT SE';

        loginBtn.onclick =
          () => openAuth('login');

      }

      admin?.classList.add(
        'hidden'
      );

      return;
    }


    const profile =
      await getProfile(
        user.id
      );


    if (loginBtn) {

      loginBtn.textContent =
        'ODHLÁSIT SE';

      loginBtn.onclick =
        logout;

    }


    if (
      profile?.role === 'admin'
    ) {

      admin?.classList.remove(
        'hidden'
      );

      await refreshAdminStats();

    } else {

      admin?.classList.add(
        'hidden'
      );

    }


  } catch (error) {

    console.error(
      'UI error:',
      error
    );

  }

}


/* =====================================================
   ARTICLES
===================================================== */

async function loadArticles() {

  if (!db) return;


  const {
    data,
    error
  } =
    await db
      .from('articles')
      .select('*')
      .order(
        'created_at',
        {
          ascending:false
        }
      );


  if (error) {

    console.error(
      'Articles error:',
      error
    );


    $('cards').innerHTML = `
      <div class="no-results">
        <strong>Články se nepodařilo načíst.</strong>
        <span>Zkontrolujte připojení k databázi.</span>
      </div>
    `;

    return;
  }


  articles =
    data || [];


  renderArticles();

  renderAdminList();


  if ($('publicArticles')) {

    $('publicArticles')
      .textContent =
      articles.length;

  }


  if ($('adminArticles')) {

    $('adminArticles')
      .textContent =
      articles.length;

  }

}


/* =====================================================
   FILTER
===================================================== */

function filterArticles(category = 'ALL') {

  currentCategory =
    category;


  document
    .querySelectorAll(
      '.category'
    )
    .forEach(button => {

      button.classList.toggle(
        'active',
        button.dataset.category === category
      );

    });


  let filtered =
    articles;


  if (category !== 'ALL') {

    filtered =
      articles.filter(
        article =>
          String(
            article.category || ''
          ).toUpperCase() ===
          category
      );

  }


  renderArticleCards(
    filtered
  );

}


function renderArticles() {

  filterArticles(
    currentCategory
  );

}


function renderArticleCards(list) {

  const cards =
    $('cards');

  if (!cards) return;


  const title =
    $('articlesTitle');

  const count =
    $('articleCount');


  if (currentCategory === 'ALL') {

    title.textContent =
      'VŠECHNY ČLÁNKY';

  } else {

    title.textContent =
      currentCategory;

  }


  if (count) {

    count.textContent =
      `${list.length} ${
        list.length === 1
          ? 'článek'
          : list.length < 5
            ? 'články'
            : 'článků'
      }`;

  }


  if (!list.length) {

    cards.innerHTML = `
      <div class="no-results">
        <strong>Zatím zde nejsou žádné články.</strong>
        <span>Zkuste jiné téma.</span>
      </div>
    `;

    return;
  }


  cards.innerHTML =
    list
      .map(card)
      .join('');


  cards
    .querySelectorAll('.card')
    .forEach(element => {

      element.addEventListener(
        'click',
        () => {

          openArticle(
            Number(
              element.dataset.id
            )
          );

        }
      );

    });

}


function card(article) {

  return `

    <article
      class="card"
      data-id="${article.id}">

      <div
        class="card-img"
        style="background-image:url('${esc(
          getImage(article)
        )}')">
      </div>

      <div class="card-body">

        <span class="tag">
          ${esc(
            article.category ||
            'POHYB'
          )}
        </span>

        <h3>
          ${esc(
            article.title
          )}
        </h3>

        <p class="card-excerpt">
          ${esc(
            article.excerpt ||
            ''
          )}
        </p>

        <div class="card-meta">

          <span>
            ${formatDate(
              article.created_at
            )}
          </span>

          <a
            href="#"
            onclick="
              event.stopPropagation();
              return false;
            ">
            ČÍST →
          </a>

        </div>

      </div>

    </article>

  `;

}


/* =====================================================
   ARTICLE DETAIL
===================================================== */

function openArticle(id) {

  const article =
    articles.find(
      item =>
        Number(item.id) ===
        Number(id)
    );


  if (!article) return;


  currentArticleId =
    article.id;


  $('articleViewTitle')
    .textContent =
      article.title || '';


  $('articleViewCategory')
    .textContent =
      article.category ||
      'POHYB';


  $('articleViewMeta')
    .textContent =
      `${formatDate(
        article.created_at
      )} · VIRENO`;


  $('articleViewImage')
    .src =
      getImage(
        article,
        true
      );


  /*
    Obsah článku se zachovává
    tak, jak ho ukládáš do Supabase.
  */

  $('articleViewContent')
    .innerHTML =
      article.content || '';


  renderRelatedArticles(
    article
  );


  $('articleView')
    .classList.remove(
      'hidden'
    );


  document.body.classList.add(
    'no-scroll'
  );

}


function closeArticle() {

  $('articleView')
    ?.classList.add(
      'hidden'
    );

  document.body.classList.remove(
    'no-scroll'
  );

  currentArticleId = null;

}


function renderRelatedArticles(article) {

  const box =
    $('relatedArticles');

  if (!box) return;


  const related =
    articles
      .filter(item =>
        Number(item.id) !==
        Number(article.id)
      )
      .filter(item =>
        item.category ===
        article.category
      )
      .slice(0,3);


  const fallback =
    related.length
      ? related
      : articles
          .filter(item =>
            Number(item.id) !==
            Number(article.id)
          )
          .slice(0,3);


  if (!fallback.length) {

    box.innerHTML =
      '<p class="muted">Zatím nejsou další články.</p>';

    return;
  }


  box.innerHTML =
    fallback
      .map(item => `

        <div
          class="related-card"
          data-related-id="${item.id}">

          <img
            src="${esc(
              getImage(item)
            )}"
            alt="">

          <div>

            <strong>
              ${esc(
                item.title
              )}
            </strong>

          </div>

        </div>

      `)
      .join('');


  box
    .querySelectorAll(
      '.related-card'
    )
    .forEach(element => {

      element.addEventListener(
        'click',
        () => {

          openArticle(
            Number(
              element.dataset.relatedId
            )
          );

        }
      );

    });

}


/* =====================================================
   DRAWER
===================================================== */

function toggleDrawer() {

  const drawer =
    $('drawer');

  const backdrop =
    $('drawerBackdrop');

  if (!drawer) return;


  drawer.classList.toggle(
    'open'
  );


  const open =
    drawer.classList.contains(
      'open'
    );


  backdrop?.classList.toggle(
    'hidden',
    !open
  );


  document.body.classList.toggle(
    'no-scroll',
    open
  );

}


function closeDrawer() {

  const drawer =
    $('drawer');

  const backdrop =
    $('drawerBackdrop');


  drawer?.classList.remove(
    'open'
  );

  backdrop?.classList.add(
    'hidden'
  );

  document.body.classList.remove(
    'no-scroll'
  );

}


/* =====================================================
   NEWSLETTER
===================================================== */

async function subscribe(event) {

  event.preventDefault();


  if (!db) return;


  const input =
    event.target.querySelector(
      'input[type=email]'
    );


  const msg =
    $('subscribeMsg');


  const email =
    input.value
      .trim()
      .toLowerCase();


  if (!email) return;


  const {
    error
  } =
    await db
      .from('subscribers')
      .insert({
        email
      });


  if (
    error &&
    !String(
      error.message
    )
      .toLowerCase()
      .includes(
        'duplicate'
      )
  ) {

    if (msg) {

      msg.innerHTML =
        `<span class="error-text">
          ${esc(
            error.message
          )}
        </span>`;

    }

    return;
  }


  event.target.reset();


  if (msg) {

    msg.innerHTML =
      `<span class="success-text">
        Jste přihlášeni. Vítejte ve Vireno!
      </span>`;

  }


  await refreshAdminStats();

}


/* =====================================================
   ADMIN STATS
===================================================== */

async function refreshAdminStats() {

  if (!db) return;


  try {

    const {
      count: subscribers
    } =
      await db
        .from('subscribers')
        .select(
          '*',
          {
            count:'exact',
            head:true
          }
        );


    const {
      data: stats
    } =
      await db
        .from('site_stats')
        .select('visits')
        .eq('id',1)
        .maybeSingle();


    if ($('subs')) {

      $('subs')
        .textContent =
        subscribers ?? 0;

    }


    if ($('visits')) {

      $('visits')
        .textContent =
        stats?.visits ?? 0;

    }


    if ($('adminArticles')) {

      $('adminArticles')
        .textContent =
        articles.length;

    }


  } catch (error) {

    console.error(
      'Stats error:',
      error
    );

  }

}


/* =====================================================
   IMAGE UPLOAD
===================================================== */

async function uploadCoverImage(file) {

  if (!file) return null;


  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];


  if (!allowed.includes(
    file.type
  )) {

    throw new Error(
      'Použijte JPG, PNG nebo WEBP.'
    );

  }


  if (
    file.size >
    5 * 1024 * 1024
  ) {

    throw new Error(
      'Obrázek musí být menší než 5 MB.'
    );

  }


  const {
    data:{
      user
    }
  } =
    await db.auth.getUser();


  if (!user) {

    throw new Error(
      'Musíte být přihlášeni.'
    );

  }


  const extension =
    file.name
      .split('.')
      .pop()
      .toLowerCase();


  const filename =
    `${user.id}/${crypto.randomUUID()}.${extension}`;


  const {
    error
  } =
    await db.storage
      .from(
        'article-images'
      )
      .upload(
        filename,
        file,
        {
          cacheControl:'3600',
          upsert:false,
          contentType:file.type
        }
      );


  if (error) {
    throw error;
  }


  const {
    data
  } =
    db.storage
      .from(
        'article-images'
      )
      .getPublicUrl(
        filename
      );


  return data.publicUrl;

}


function showCoverPreview(url) {

  const preview =
    $('coverPreview');

  const image =
    $('coverPreviewImg');


  if (!preview || !image) return;


  if (!url) {

    preview.classList.add(
      'hidden'
    );

    image.src = '';

    return;
  }


  image.src = url;

  preview.classList.remove(
    'hidden'
  );

}


/* =====================================================
   SAVE ARTICLE
===================================================== */

async function saveArticle(event) {

  event.preventDefault();


  if (!(await isAdmin())) {

    $('articleMsg').textContent =
      'Přístup mají pouze administrátoři.';

    return;
  }


  const button =
    $('articleSubmit');


  button.disabled = true;

  button.textContent =
    'UKLÁDÁM...';


  try {

    let coverUrl =
      $('cover')
        ?.value
        .trim() ||
      null;


    const file =
      $('coverFile')
        ?.files?.[0];


    if (file) {

      $('articleMsg').textContent =
        'Nahrávám obrázek...';


      coverUrl =
        await uploadCoverImage(
          file
        );

    }


    const payload = {

      title:
        $('title')
          .value
          .trim(),

      excerpt:
        $('excerpt')
          .value
          .trim(),

      content:
        $('content')
          .value
          .trim(),

      cover_url:
        coverUrl,

      category:
        $('category')
          .value

    };


    let result;


    if (editingId) {

      result =
        await db
          .from('articles')
          .update(payload)
          .eq(
            'id',
            editingId
          );

    } else {

      const {
        data:{
          user
        }
      } =
        await db.auth.getUser();


      result =
        await db
          .from('articles')
          .insert({
            ...payload,
            author_id:user.id
          });

    }


    if (result.error) {
      throw result.error;
    }


    $('articleMsg').textContent =
      editingId
        ? 'Článek byl upraven.'
        : 'Článek byl publikován.';


    editingId = null;


    clearArticleForm(
      false
    );


    await loadArticles();

    await refreshAdminStats();


  } catch (error) {

    console.error(
      'Save article error:',
      error
    );


    $('articleMsg').textContent =
      error.message ||
      'Článek se nepodařilo uložit.';


  } finally {

    button.disabled = false;

    button.textContent =
      'PUBLIKOVAT ČLÁNEK';

  }

}


/* =====================================================
   EDIT ARTICLE
===================================================== */

function editArticle(id) {

  const article =
    articles.find(
      item =>
        Number(item.id) ===
        Number(id)
    );


  if (!article) return;


  editingId =
    article.id;


  $('title').value =
    article.title || '';


  $('category').value =
    article.category ||
    'POHYB';


  $('cover').value =
    article.cover_url ||
    '';


  $('excerpt').value =
    article.excerpt ||
    '';


  $('content').value =
    article.content ||
    '';


  showCoverPreview(
    article.cover_url ||
    null
  );


  $('articleSubmit').textContent =
    'ULOŽIT ZMĚNY';


  $('admin').scrollIntoView({
    behavior:'smooth'
  });

}


/* =====================================================
   CLEAR FORM
===================================================== */

function clearArticleForm(
  resetMessage = true
) {

  editingId = null;


  $('articleForm')
    ?.reset();


  if ($('cover')) {
    $('cover').value = '';
  }


  if ($('coverFile')) {
    $('coverFile').value = '';
  }


  showCoverPreview(
    null
  );


  if ($('articleSubmit')) {

    $('articleSubmit')
      .textContent =
      'PUBLIKOVAT ČLÁNEK';

  }


  if (
    resetMessage &&
    $('articleMsg')
  ) {

    $('articleMsg')
      .textContent = '';

  }

}


/* =====================================================
   DELETE ARTICLE
===================================================== */

async function deleteArticle(id) {

  if (!(await isAdmin())) {

    alert(
      'Přístup mají pouze administrátoři.'
    );

    return;
  }


  if (
    !confirm(
      'Opravdu chcete tento článek smazat?'
    )
  ) {

    return;
  }


  const article =
    articles.find(
      item =>
        Number(item.id) ===
        Number(id)
    );


  const {
    error
  } =
    await db
      .from('articles')
      .delete()
      .eq(
        'id',
        id
      );


  if (error) {

    alert(
      error.message
    );

    return;
  }


  if (article?.cover_url) {

    const marker =
      '/storage/v1/object/public/article-images/';


    const index =
      article.cover_url.indexOf(
        marker
      );


    if (index !== -1) {

      const path =
        article.cover_url.substring(
          index + marker.length
        );


      try {

        await db.storage
          .from(
            'article-images'
          )
          .remove([
            path
          ]);

      } catch (error) {

        console.warn(
          'Obrázek nebyl odstraněn:',
          error
        );

      }

    }

  }


  await loadArticles();

  await refreshAdminStats();

}


/* =====================================================
   ADMIN LIST
===================================================== */

function renderAdminList() {

  const box =
    $('adminList');


  if (!box) return;


  if (!articles.length) {

    box.innerHTML =
      '<p class="muted">Zatím nejsou žádné články.</p>';

    return;
  }


  box.innerHTML =
    articles
      .map(article => `

        <div class="admin-row">

          <div>

            <b>
              ${esc(
                article.title
              )}
            </b>

            <small>
              ${formatDate(
                article.created_at
              )}
              ·
              ${esc(
                article.category ||
                'POHYB'
              )}
            </small>

          </div>

          <div>

            <button
              type="button"
              data-edit="${article.id}">
              UPRAVIT
            </button>

            <button
              type="button"
              class="danger"
              data-delete="${article.id}">
              SMAZAT
            </button>

          </div>

        </div>

      `)
      .join('');


  box
    .querySelectorAll(
      '[data-edit]'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          editArticle(
            Number(
              button.dataset.edit
            )
          );

        }
      );

    });


  box
    .querySelectorAll(
      '[data-delete]'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          deleteArticle(
            Number(
              button.dataset.delete
            )
          );

        }
      );

    });

}


/* =====================================================
   VISITS
===================================================== */

async function trackVisit() {

  if (!db) return;


  try {

    await db.rpc(
      'track_page_view'
    );

  } catch (error) {

    console.warn(
      'Tracking návštěvy selhal:',
      error
    );

  }

}


/* =====================================================
   EVENTS
===================================================== */

function setupEvents() {

  /* AUTH */

  $('loginBtn')?.addEventListener(
    'click',
    () => openAuth('login')
  );


  $('authForm')?.addEventListener(
    'submit',
    handleAuth
  );


  $('authSwitch')?.addEventListener(
    'click',
    toggleAuthMode
  );


  $('authClose')?.addEventListener(
    'click',
    closeAuth
  );


  $('auth')?.addEventListener(
    'click',
    event => {

      if (
        event.target ===
        $('auth')
      ) {

        closeAuth();

      }

    }
  );


  /* SEARCH */

  setupSearch();


  /* ARTICLE */

  $('articleClose')?.addEventListener(
    'click',
    closeArticle
  );


  $('articleView')?.addEventListener(
    'click',
    event => {

      if (
        event.target ===
        $('articleView')
      ) {

        closeArticle();

      }

    }
  );


  /* NEWSLETTER */

  $('subscribe')?.addEventListener(
    'submit',
    subscribe
  );


  /* CATEGORIES */

  document
    .querySelectorAll(
      '.category'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          filterArticles(
            button.dataset.category
          );

          document
            .getElementById(
              'articles'
            )
            ?.scrollIntoView({
              behavior:'smooth'
            });

        }
      );

    });


  /* MOBILE MENU */

  $('menuBtn')?.addEventListener(
    'click',
    toggleDrawer
  );


  $('drawerClose')?.addEventListener(
    'click',
    closeDrawer
  );


  $('drawerBackdrop')?.addEventListener(
    'click',
    closeDrawer
  );


  document
    .querySelectorAll(
      '.mobile-nav a'
    )
    .forEach(link => {

      link.addEventListener(
        'click',
        closeDrawer
      );

    });


  document
    .querySelectorAll(
      '.drawer-category'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          filterArticles(
            button.dataset.category
          );

          closeDrawer();

          document
            .getElementById(
              'articles'
            )
            ?.scrollIntoView({
              behavior:'smooth'
            });

        }
      );

    });


  /* ADMIN */

  $('articleForm')?.addEventListener(
    'submit',
    saveArticle
  );


  $('clearArticleBtn')?.addEventListener(
    'click',
    () => clearArticleForm()
  );


  $('coverFile')?.addEventListener(
    'change',
    event => {

      const file =
        event.target.files?.[0];


      if (!file) return;


      const reader =
        new FileReader();


      reader.onload =
        () => {

          showCoverPreview(
            reader.result
          );

        };


      reader.readAsDataURL(
        file
      );

    }
  );


  /* ESCAPE */

  document.addEventListener(
    'keydown',
    event => {

      if (
        event.key !== 'Escape'
      ) {
        return;
      }


      if (
        !$('articleView')
          ?.classList
          .contains('hidden')
      ) {

        closeArticle();

      }


      if (
        !$('auth')
          ?.classList
          .contains('hidden')
      ) {

        closeAuth();

      }


      if (
        !$('searchOverlay')
          ?.classList
          .contains('hidden')
      ) {

        closeSearch();

      }


      closeDrawer();

    }
  );

}


/* =====================================================
   INIT
===================================================== */

async function init() {

  console.log(
    'Vireno se spouští...'
  );


  if (!initSupabase()) {

    console.error(
      'Supabase se nepodařilo inicializovat.'
    );

    return;
  }


  setupEvents();


  await loadArticles();


  await trackVisit();


  await updateUserUI();


  console.log(
    'Vireno je připraveno.'
  );

}


/* =====================================================
   START
===================================================== */

if (
  document.readyState ===
  'loading'
) {

  document.addEventListener(
    'DOMContentLoaded',
    init
  );

} else {

  init();

}
