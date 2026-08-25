const SUPABASE_URL =
  'https://nyanfbaosqshqiqvxesn.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_L2uEZD5AX-AkKEuZ_YKQDw_6uH1FS6O';

let db = null;
let articles = [];
let editingId = null;
let authMode = 'login';
let searchOpen = false;


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

  return article.cover_url ||
    (
      large
        ? 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80'
        : 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80'
    );

}


/* =====================================================
   SUPABASE
===================================================== */

function initSupabase() {

  if (!window.supabase) {

    console.error(
      'Knihovna Supabase nebyla načtena.'
    );

    return false;
  }

  db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  return true;

}


/* =====================================================
   NAVIGACE
===================================================== */

function setupNavigation() {

  document.querySelectorAll(
    '[data-page]'
  ).forEach(link => {

    link.addEventListener(
      'click',
      event => {

        const page =
          link.dataset.page;

        if (!page) return;

        event.preventDefault();

        navigateTo(page);

        closeMobileMenu();
        closeDrawer();

      }
    );

  });


  window.addEventListener(
    'hashchange',
    handleHash
  );

}


function navigateTo(page) {

  const validPages = [
    'home',
    'articles',
    'about'
  ];

  if (!validPages.includes(page)) {
    page = 'home';
  }

  const target =
    `#${page}`;

  if (
    window.location.hash !== target
  ) {

    window.location.hash =
      target;

  } else {

    showPage(page);

  }

}


function handleHash() {

  let page =
    window.location.hash
      .replace('#','')
      .trim();

  if (!page) {
    page = 'home';
  }

  if (
    ![
      'home',
      'articles',
      'about'
    ].includes(page)
  ) {
    page = 'home';
  }

  showPage(page);

}


function showPage(page) {

  const pages = {
    home:$('pageHome'),
    articles:$('pageArticles'),
    about:$('pageAbout')
  };

  Object.keys(pages).forEach(
    key => {

      if (!pages[key]) return;

      pages[key].classList.toggle(
        'hidden',
        key !== page
      );

    }
  );


  document.querySelectorAll(
    '.nav-link'
  ).forEach(link => {

    link.classList.toggle(
      'active',
      link.dataset.page === page
    );

  });


  if (page === 'articles') {
    renderAllArticles();
  }


  window.scrollTo({
    top:0,
    behavior:'smooth'
  });

}


/* =====================================================
   SEARCH
===================================================== */

function setupSearch() {

  const button =
    $('searchBtn');

  const articlesButton =
    $('articlesSearchBtn');

  const input =
    $('searchInput');

  const close =
    $('searchClose');

  const overlay =
    $('searchOverlay');


  if (
    !button ||
    !input ||
    !close ||
    !overlay
  ) {

    console.warn(
      'Vyhledávání: chybí HTML prvky.'
    );

    return;
  }


  button.addEventListener(
    'click',
    event => {

      event.stopPropagation();

      openSearch();

    }
  );


  if (articlesButton) {

    articlesButton.addEventListener(
      'click',
      openSearch
    );

  }


  close.addEventListener(
    'click',
    closeSearch
  );


  input.addEventListener(
    'input',
    () => {

      filterArticles(
        input.value
      );

    }
  );


  input.addEventListener(
    'keydown',
    event => {

      if (
        event.key === 'Escape'
      ) {

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

  if (!overlay || !input) {
    return;
  }

  searchOpen = true;

  overlay.classList.remove(
    'hidden'
  );

  document.body.classList.add(
    'search-active'
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

  if (!overlay || !input) {
    return;
  }

  searchOpen = false;

  input.value = '';

  overlay.classList.add(
    'hidden'
  );

  document.body.classList.remove(
    'search-active'
  );


  renderArticles();

}


function filterArticles(search = '') {

  const query =
    search.trim().toLowerCase();


  if (!query) {

    if (
      window.location.hash === '#articles'
    ) {

      renderAllArticles();

    } else {

      renderArticles();

    }

    return;
  }


  const filtered =
    articles.filter(article => {

      const title =
        String(
          article.title || ''
        ).toLowerCase();

      const category =
        String(
          article.category || ''
        ).toLowerCase();

      const excerpt =
        String(
          article.excerpt || ''
        ).toLowerCase();

      const content =
        String(
          article.content || ''
        ).toLowerCase();


      return (
        title.includes(query) ||
        category.includes(query) ||
        excerpt.includes(query) ||
        content.includes(query)
      );

    });


  const cards =
    $('cards');

  const all =
    $('allArticles');


  const html =
    filtered.length
      ? filtered.map(card).join('')
      : `
        <div class="no-results">
          <strong>Nic jsme nenašli</strong>
          <span>
            Zkuste hledat jiný název,
            kategorii nebo výraz.
          </span>
        </div>
      `;


  if (
    window.location.hash === '#articles'
  ) {

    if (all) {
      all.innerHTML = html;
    }

  } else {

    if (cards) {
      cards.innerHTML = html;
    }

  }

}


/* =====================================================
   ARTICLE CARD
===================================================== */

function card(article) {

  return `
    <article class="card">

      <div
        class="card-img"
        style="background-image:url('${esc(getImage(article))}')">
      </div>

      <div class="card-body">

        <span class="tag">
          ${esc(article.category || 'POHYB')}
        </span>

        <h3>
          ${esc(article.title || '')}
        </h3>

        <p class="card-excerpt">
          ${esc(article.excerpt || '')}
        </p>

        <div class="card-meta">

          <span>
            ${formatDate(article.created_at)}
          </span>

          <a
            href="#"
            data-article-id="${article.id}"
            class="article-link">
            ČÍST ČLÁNEK →
          </a>

        </div>

      </div>

    </article>
  `;

}


function renderArticles() {

  const cards =
    $('cards');

  if (!cards) return;


  if (!articles.length) {

    cards.innerHTML = `
      <div class="no-results">
        <strong>Zatím zde nejsou žádné články.</strong>
        <span>
          První články se brzy objeví.
        </span>
      </div>
    `;

    return;
  }


  cards.innerHTML =
    articles
      .slice(0,4)
      .map(card)
      .join('');


  bindArticleLinks();

}


function renderAllArticles() {

  const all =
    $('allArticles');

  if (!all) return;


  if (!articles.length) {

    all.innerHTML = `
      <div class="no-results">
        <strong>Zatím zde nejsou žádné články.</strong>
      </div>
    `;

    return;
  }


  all.innerHTML =
    articles
      .map(card)
      .join('');


  bindArticleLinks();

}


function bindArticleLinks() {

  document.querySelectorAll(
    '.article-link'
  ).forEach(link => {

    link.onclick =
      event => {

        event.preventDefault();

        openArticle(
          link.dataset.articleId
        );

      };

  });

}


/* =====================================================
   LOAD ARTICLES
===================================================== */

async function loadArticles() {

  if (!db) return;


  const {
    data,
    error
  } = await db
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
      'Články se nepodařilo načíst:',
      error
    );


    const message = `
      <div class="no-results">
        <strong>Články se nepodařilo načíst.</strong>
        <span>
          Zkontrolujte připojení k Supabase
          a nastavení databáze.
        </span>
      </div>
    `;


    if ($('cards')) {
      $('cards').innerHTML =
        message;
    }

    if ($('allArticles')) {
      $('allArticles').innerHTML =
        message;
    }

    return;
  }


  articles =
    data || [];


  renderArticles();
  renderAllArticles();
  renderDrawerArticles();
  renderAdminList();


  if ($('adminArticles')) {

    $('adminArticles').textContent =
      articles.length;

  }


  if ($('publicArticles')) {

    $('publicArticles').textContent =
      articles.length;

  }

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


  const title =
    $('articleViewTitle');

  const meta =
    $('articleViewMeta');

  const image =
    $('articleViewImage');

  const content =
    $('articleViewContent');

  const modal =
    $('articleView');


  if (!modal) return;


  if (title) {
    title.textContent =
      article.title || '';
  }


  if (meta) {

    meta.textContent =
      `${formatDate(article.created_at)} · ${article.category || 'POHYB'}`;

  }


  if (image) {

    image.src =
      getImage(
        article,
        true
      );

  }


  if (content) {

    /*
      Obsah článku je vložený jako HTML,
      protože editor může obsahovat
      například obrázky nebo formátování.
    */
    content.innerHTML =
      article.content || '';

  }


  modal.classList.remove(
    'hidden'
  );

  document.body.classList.add(
    'modal-open'
  );

}


function closeArticle() {

  $('articleView')
    ?.classList
    .add('hidden');

  document.body.classList.remove(
    'modal-open'
  );

}


/* =====================================================
   DRAWER
===================================================== */

function toggleDrawer() {

  const drawer =
    $('drawer');

  if (!drawer) return;

  drawer.classList.toggle(
    'open'
  );

}


function closeDrawer() {

  $('drawer')
    ?.classList
    .remove('open');

}


function renderDrawerArticles() {

  const drawer =
    $('drawerArticles');

  if (!drawer) return;


  if (!articles.length) {

    drawer.innerHTML =
      '<p class="muted">Zatím nejsou žádné články.</p>';

    return;
  }


  drawer.innerHTML =
    articles
      .slice(0,8)
      .map(article => `

        <div
          class="drawer-item"
          data-drawer-id="${article.id}">

          <img
            src="${esc(getImage(article))}"
            alt="">

          <div>

            <b>
              ${esc(article.title)}
            </b>

            <small>
              ${formatDate(article.created_at)}
              ·
              ${esc(article.category || 'POHYB')}
            </small>

          </div>

        </div>

      `)
      .join('');


  document.querySelectorAll(
    '[data-drawer-id]'
  ).forEach(item => {

    item.addEventListener(
      'click',
      () => {

        openArticle(
          item.dataset.drawerId
        );

        closeDrawer();

      }
    );

  });

}


/* =====================================================
   MOBILE MENU
===================================================== */

function setupMobileMenu() {

  const menuBtn =
    $('menuBtn');

  const closeBtn =
    $('mobileMenuClose');

  const menu =
    $('mobileMenu');

  const backdrop =
    $('mobileBackdrop');


  if (
    !menuBtn ||
    !closeBtn ||
    !menu ||
    !backdrop
  ) {
    return;
  }


  menuBtn.addEventListener(
    'click',
    openMobileMenu
  );


  closeBtn.addEventListener(
    'click',
    closeMobileMenu
  );


  backdrop.addEventListener(
    'click',
    closeMobileMenu
  );


  document.querySelectorAll(
    '#mobileMenu [data-page]'
  ).forEach(link => {

    link.addEventListener(
      'click',
      () => {

        closeMobileMenu();

      }
    );

  });

}


function openMobileMenu() {

  $('mobileMenu')
    ?.classList
    .add('open');

  $('mobileBackdrop')
    ?.classList
    .add('open');

  document.body.classList.add(
    'menu-open'
  );

}


function closeMobileMenu() {

  $('mobileMenu')
    ?.classList
    .remove('open');

  $('mobileBackdrop')
    ?.classList
    .remove('open');

  document.body.classList.remove(
    'menu-open'
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

  document.body.classList.add(
    'modal-open'
  );


  if ($('authTitle')) {

    $('authTitle').textContent =
      mode === 'signup'
        ? 'VYTVOŘIT ÚČET'
        : 'PŘIHLÁSIT SE';

  }


  if ($('authSubmit')) {

    $('authSubmit').textContent =
      mode === 'signup'
        ? 'VYTVOŘIT ÚČET'
        : 'PŘIHLÁSIT SE';

  }


  if ($('authSwitch')) {

    $('authSwitch').textContent =
      mode === 'signup'
        ? 'Už máte účet? Přihlaste se'
        : 'Nemáte účet? Vytvořte si ho';

  }


  if ($('authMsg')) {
    $('authMsg').textContent = '';
  }


  setTimeout(
    () => $('authEmail')?.focus(),
    50
  );

}


function closeAuth() {

  $('auth')
    ?.classList
    .add('hidden');

  document.body.classList.remove(
    'modal-open'
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


  if (!db) {

    $('authMsg').textContent =
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

    $('authMsg').textContent =
      'Vyplňte e-mail a heslo.';

    return;
  }


  $('authMsg').textContent =
    'Pracuji...';


  try {

    if (
      authMode === 'signup'
    ) {

      const {
        data,
        error
      } =
        await db.auth.signUp({
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
          'Účet byl úspěšně vytvořen.';

        setTimeout(
          async () => {

            closeAuth();

            await updateUserUI();

          },
          700
        );

      } else {

        $('authMsg').textContent =
          'Účet byl vytvořen. Zkontrolujte svůj e-mail a potvrďte registraci.';

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

      $('authMsg').textContent =
        error.message;

      return;
    }


    closeAuth();

    await updateUserUI();


  } catch (error) {

    console.error(
      'Chyba přihlášení:',
      error
    );

    $('authMsg').textContent =
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
   USER / ADMIN
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
      'Chyba profilu:',
      error
    );

    return null;
  }


  return data;

}


async function isAdmin() {

  if (!db) return false;


  const {
    data: {
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
      data: {
        user
      }
    } =
      await db.auth.getUser();


    const loginBtn =
      $('loginBtn');

    const mobileLoginBtn =
      $('mobileLoginBtn');

    const admin =
      $('admin');


    if (!user) {

      if (loginBtn) {

        loginBtn.textContent =
          'PŘIHLÁSIT SE';

        loginBtn.onclick =
          () => openAuth('login');

      }


      if (mobileLoginBtn) {

        mobileLoginBtn.textContent =
          'PŘIHLÁSIT SE';

        mobileLoginBtn.onclick =
          () => {

            closeMobileMenu();

            openAuth('login');

          };

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


    if (mobileLoginBtn) {

      mobileLoginBtn.textContent =
        'ODHLÁSIT SE';

      mobileLoginBtn.onclick =
        () => {

          closeMobileMenu();

          logout();

        };

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
      'Chyba uživatelského rozhraní:',
      error
    );

  }

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

      $('subs').textContent =
        subscribers ?? 0;

    }


    if ($('adminArticles')) {

      $('adminArticles').textContent =
        articles.length;

    }


    if ($('visits')) {

      $('visits').textContent =
        stats?.visits ?? 0;

    }


  } catch (error) {

    console.error(
      'Chyba statistik:',
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


  if (!allowed.includes(file.type)) {

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
      .from('article-images')
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
      .from('article-images')
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


  if (!preview || !image) {
    return;
  }


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


  if (button) {

    button.disabled = true;

    button.textContent =
      'UKLÁDÁM...';

  }


  try {

    let coverUrl =
      $('cover')?.value.trim() ||
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
        ? 'Článek byl úspěšně upraven.'
        : 'Článek byl úspěšně publikován.';


    editingId = null;

    clearArticleForm(false);

    await loadArticles();

    await refreshAdminStats();


  } catch (error) {

    console.error(
      'Chyba při ukládání článku:',
      error
    );

    $('articleMsg').textContent =
      error.message ||
      'Něco se nepodařilo.';


  } finally {

    if (button) {

      button.disabled = false;

      button.textContent =
        'PUBLIKOVAT ČLÁNEK';

    }

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
    article.category || 'POHYB';


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
    'ULOŽIT ZMĚNY';


  $('admin').scrollIntoView({
    behavior:'smooth'
  });

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
          .from('article-images')
          .remove([
            path
          ]);

      } catch (error) {

        console.warn(
          'Obrázek se nepodařilo odstranit:',
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
    articles.map(
      article => `

        <div class="admin-row">

          <div>

            <b>
              ${esc(article.title)}
            </b>

            <small>
              ${formatDate(article.created_at)}
              ·
              ${esc(article.category || 'POHYB')}
            </small>

          </div>

          <div>

            <button
              type="button"
              data-edit-id="${article.id}">
              UPRAVIT
            </button>

            <button
              type="button"
              class="danger"
              data-delete-id="${article.id}">
              SMAZAT
            </button>

          </div>

        </div>

      `
    ).join('');


  box.querySelectorAll(
    '[data-edit-id]'
  ).forEach(button => {

    button.addEventListener(
      'click',
      () => {

        editArticle(
          button.dataset.editId
        );

      }
    );

  });


  box.querySelectorAll(
    '[data-delete-id]'
  ).forEach(button => {

    button.addEventListener(
      'click',
      () => {

        deleteArticle(
          button.dataset.deleteId
        );

      }
    );

  });

}


/* =====================================================
   CLEAR FORM
===================================================== */

function clearArticleForm(
  showMessage = true
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


  showCoverPreview(null);


  if ($('articleSubmit')) {

    $('articleSubmit').textContent =
      'PUBLIKOVAT ČLÁNEK';

  }


  if (
    showMessage &&
    $('articleMsg')
  ) {

    $('articleMsg').textContent = '';

  }

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
    !String(error.message)
      .toLowerCase()
      .includes('duplicate')
  ) {

    event.target.innerHTML =
      `<b class="error-text">
        ${esc(error.message)}
      </b>`;

    return;

  }


  event.target.innerHTML =
    `<b class="success-text">
      Jste přihlášeni. Vítejte ve Vireno!
    </b>`;


  await refreshAdminStats();

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
      'Sledování návštěvy selhalo:',
      error
    );

  }

}


/* =====================================================
   EVENTS
===================================================== */

function setupEvents() {

  setupNavigation();

  setupSearch();

  setupMobileMenu();


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


  if ($('clearArticleBtn')) {

    $('clearArticleBtn')
      .addEventListener(
        'click',
        () => clearArticleForm(true)
      );

  }


  if ($('coverFile')) {

    $('coverFile')
      .addEventListener(
        'change',
        event => {

          const file =
            event.target
              .files?.[0];


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

  }


  if ($('auth')) {

    $('auth')
      .addEventListener(
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

  }


  if ($('articleView')) {

    $('articleView')
      .addEventListener(
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

  }


  document.addEventListener(
    'keydown',
    event => {

      if (
        event.key === 'Escape'
      ) {

        if (searchOpen) {
          closeSearch();
        }

        closeMobileMenu();
        closeArticle();
        closeAuth();

      }

    }
  );

}


/* =====================================================
   START
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


  handleHash();


  console.log(
    'Vireno je připraveno.'
  );

}


/* =====================================================
   DOM READY
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
