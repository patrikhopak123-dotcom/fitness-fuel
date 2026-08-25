const SUPABASE_URL =
  'https://nyanfbaosqshqiqvxesn.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_L2uEZD5AX-AkKEuZ_YKQDw_6uH1FS6O';


let db = null;
let articles = [];
let editingId = null;
let authMode = 'login';


const $ = id =>
  document.getElementById(id);


/* =========================
   HELPERS
========================= */

function esc(value = '') {

  return String(value).replace(
    /[&<>'"]/g,
    c => ({
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
   SUPABASE
========================= */

function initSupabase() {

  if (!window.supabase) {

    console.error(
      'Supabase library was not loaded.'
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


/* =========================
   SEARCH
========================= */

function setupSearch() {

  const searchButton =
    $('searchBtn');

  const searchPanel =
    $('searchPanel');

  const searchBox =
    $('searchBox');

  const searchClose =
    $('searchClose');


  if (
    !searchButton ||
    !searchPanel ||
    !searchBox
  ) {

    console.error(
      'Search HTML elements are missing.'
    );

    return;
  }


  /*
    OPEN SEARCH
  */

  searchButton.addEventListener(
    'click',
    event => {

      event.preventDefault();
      event.stopPropagation();

      searchPanel.classList.remove(
        'hidden'
      );

      setTimeout(() => {

        searchBox.focus();

      }, 50);

    }
  );


  /*
    LIVE FILTER
  */

  searchBox.addEventListener(
    'input',
    () => {

      filterArticles(
        searchBox.value
      );

    }
  );


  /*
    CLOSE BUTTON
  */

  if (searchClose) {

    searchClose.addEventListener(
      'click',
      event => {

        event.preventDefault();
        event.stopPropagation();

        closeSearch();

      }
    );

  }


  /*
    ESC
  */

  searchBox.addEventListener(
    'keydown',
    event => {

      if (
        event.key === 'Escape'
      ) {

        closeSearch();

      }

    }
  );

}


/*
   CLOSE SEARCH
*/

function closeSearch() {

  const searchPanel =
    $('searchPanel');

  const searchBox =
    $('searchBox');


  if (!searchPanel) return;


  searchPanel.classList.add(
    'hidden'
  );


  if (searchBox) {
    searchBox.value = '';
  }


  filterArticles('');

}


/*
   FILTER
*/

function filterArticles(search = '') {

  const query =
    search
      .trim()
      .toLowerCase();


  const cards =
    $('cards');


  if (!cards) return;


  /*
    SEARCH EMPTY
  */

  if (!query) {

    cards.innerHTML =
      articles.length

        ? articles
            .slice(0, 4)
            .map(card)
            .join('')

        : `
          <p style="color:#888">
            No articles yet.
          </p>
        `;

    return;
  }


  /*
    FILTER TITLE + CATEGORY
  */

  const filtered =
    articles.filter(
      article => {

        const title =
          String(
            article.title || ''
          ).toLowerCase();

        const category =
          String(
            article.category || ''
          ).toLowerCase();


        return (
          title.includes(query) ||
          category.includes(query)
        );

      }
    );


  /*
    NOTHING FOUND
  */

  if (!filtered.length) {

    cards.innerHTML = `
      <p style="
        color:#888;
        grid-column:1/-1;
        padding:20px 0;
      ">
        No articles found.
      </p>
    `;

    return;
  }


  /*
    RESULTS
  */

  cards.innerHTML =
    filtered
      .map(card)
      .join('');

}


/* =========================
   AUTH
========================= */

function openAuth(
  mode = 'login'
) {

  authMode = mode;


  const auth =
    $('auth');


  if (!auth) {

    console.error(
      'Element #auth was not found.'
    );

    return;
  }


  auth.classList.remove(
    'hidden'
  );


  if ($('authTitle')) {

    $('authTitle').textContent =
      mode === 'signup'
        ? 'CREATE ACCOUNT'
        : 'LOG IN';

  }


  if ($('authSubmit')) {

    $('authSubmit').textContent =
      mode === 'signup'
        ? 'SIGN UP'
        : 'LOG IN';

  }


  if ($('authSwitch')) {

    $('authSwitch').textContent =
      mode === 'signup'

        ? 'Already have an account? Log in'

        : "Don't have an account? Sign up";

  }


  if ($('authMsg')) {

    $('authMsg').textContent = '';

  }


  setTimeout(() => {

    $('authEmail')?.focus();

  }, 50);

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


/* =========================
   AUTH HANDLER
========================= */

async function handleAuth(
  event
) {

  event.preventDefault();


  if (!db) {

    $('authMsg').textContent =
      'Supabase is not connected.';

    return;
  }


  const email =
    $('authEmail')
      .value
      .trim();


  const password =
    $('authPassword')
      .value;


  $('authMsg').textContent =
    'Please wait...';


  try {

    /*
      SIGN UP
    */

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
          'Account created successfully.';


        setTimeout(() => {

          closeAuth();
          updateUserUI();

        }, 1000);

      } else {

        $('authMsg').textContent =
          'Account created. Check your email to confirm your account.';

      }


      return;
    }


    /*
      LOGIN
    */

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
      'Login error:',
      error
    );


    $('authMsg').textContent =
      error.message ||
      'Login failed.';

  }

}


/* =========================
   LOGOUT
========================= */

async function logout() {

  if (!db) return;

  await db.auth.signOut();

  await updateUserUI();

}


/* =========================
   PROFILE
========================= */

async function getProfile(
  userId
) {

  if (
    !db ||
    !userId
  ) {
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
      'Profile error:',
      error
    );

    return null;
  }


  return data;

}


/* =========================
   ADMIN CHECK
========================= */

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


  return (
    profile?.role === 'admin'
  );

}


/* =========================
   USER UI
========================= */

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

    const admin =
      $('admin');


    /*
      LOGGED OUT
    */

    if (!user) {

      if (loginBtn) {

        loginBtn.textContent =
          'LOG IN';

        loginBtn.onclick =
          () => openAuth('login');

      }


      admin?.classList.add(
        'hidden'
      );


      return;
    }


    /*
      LOGGED IN
    */

    const profile =
      await getProfile(
        user.id
      );


    if (loginBtn) {

      loginBtn.textContent =
        'LOG OUT';

      loginBtn.onclick =
        logout;

    }


    /*
      ADMIN
    */

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
      'User UI error:',
      error
    );

  }

}


/* =========================
   ARTICLE CARD
========================= */

function card(article) {

  const image =
    article.cover_url ||

    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=700&q=80';


  return `
    <article class="card">

      <div
        class="card-img"
        style="background-image:url('${esc(image)}')">
      </div>

      <div class="card-body">

        <span class="tag">
          ${esc(
            article.category ||
            'TRAINING'
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
              openArticle(${article.id});
              return false;
            ">

            READ MORE →

          </a>

        </div>

      </div>

    </article>
  `;

}


/* =========================
   RENDER ARTICLES
========================= */

function renderArticles() {

  const cards =
    $('cards');

  const drawer =
    $('drawerArticles');


  /*
    PUBLIC CARDS
  */

  if (cards) {

    cards.innerHTML =
      articles.length

        ? articles
            .slice(0, 4)
            .map(card)
            .join('')

        : `
          <p style="color:#888">
            No articles yet.
          </p>
        `;

  }


  /*
    DRAWER
  */

  if (drawer) {

    drawer.innerHTML =
      articles.length

        ? articles
            .map(
              article => `

              <div
                class="drawer-item"
                onclick="
                  openArticle(${article.id});
                  toggleDrawer();
                "
                style="cursor:pointer">

                ${
                  article.cover_url

                    ? `
                      <img
                        src="${esc(
                          article.cover_url
                        )}"
                        alt="">
                    `

                    : ''
                }

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
                      'TRAINING'
                    )}
                  </small>

                </div>

              </div>

            `
            )
            .join('')

        : `
          <p style="color:#888">
            No articles yet.
          </p>
        `;

  }

}


/* =========================
   LOAD ARTICLES
========================= */

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
      'Could not load articles:',
      error
    );


    if ($('cards')) {

      $('cards').innerHTML =
        `
          <p style="color:#f66">
            Could not load articles.
          </p>
        `;

    }


    return;
  }


  articles =
    data || [];


  renderArticles();

  renderAdminList();


  if ($('adminArticles')) {

    $('adminArticles')
      .textContent =
      articles.length;

  }


  if ($('publicArticles')) {

    $('publicArticles')
      .textContent =
      articles.length;

  }

}


/* =========================
   DRAWER
========================= */

function toggleDrawer() {

  $('drawer')
    ?.classList
    .toggle('open');

}


/* =========================
   ADMIN STATS
========================= */

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

      $('adminArticles')
        .textContent =
        articles.length;

    }


    if ($('visits')) {

      $('visits').textContent =
        stats?.visits ?? 0;

    }


  } catch (error) {

    console.error(
      'Admin stats error:',
      error
    );

  }

}


/* =========================
   IMAGE UPLOAD
========================= */

async function uploadCoverImage(
  file
) {

  if (!file) return null;


  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];


  if (
    !allowed.includes(
      file.type
    )
  ) {

    throw new Error(
      'Please use JPG, PNG or WEBP.'
    );

  }


  if (
    file.size >
    5 * 1024 * 1024
  ) {

    throw new Error(
      'Image must be smaller than 5 MB.'
    );

  }


  const {
    data: {
      user
    }
  } =
    await db.auth.getUser();


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


/* =========================
   COVER PREVIEW
========================= */

function showCoverPreview(
  url
) {

  const preview =
    $('coverPreview');

  const image =
    $('coverPreviewImg');


  if (
    !preview ||
    !image
  ) {
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


/* =========================
   REMOVE COVER
========================= */

async function removeCoverImage() {

  const cover =
    $('cover');


  const url =
    cover?.value || '';


  if (url) {

    const marker =
      '/storage/v1/object/public/article-images/';


    const index =
      url.indexOf(marker);


    if (index !== -1) {

      const path =
        url.substring(
          index + marker.length
        );


      try {

        await db.storage
          .from('article-images')
          .remove([path]);

      } catch (error) {

        console.warn(
          'Could not delete image:',
          error
        );

      }

    }

  }


  if (cover) {
    cover.value = '';
  }


  if ($('coverFile')) {
    $('coverFile').value = '';
  }


  showCoverPreview(null);

}


/* =========================
   SAVE ARTICLE
========================= */

async function saveArticle(
  event
) {

  event.preventDefault();


  if (
    !(await isAdmin())
  ) {

    $('articleMsg').textContent =
      'Admin access required.';

    return;
  }


  const button =
    $('articleSubmit');


  if (button) {

    button.disabled = true;

    button.textContent =
      'SAVING...';

  }


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
        'Uploading image...';


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


    /*
      UPDATE
    */

    if (editingId) {

      result =
        await db
          .from('articles')
          .update(payload)
          .eq(
            'id',
            editingId
          );

    }


    /*
      INSERT
    */

    else {

      const {
        data: {
          user
        }
      } =
        await db.auth.getUser();


      result =
        await db
          .from('articles')
          .insert({

            ...payload,

            author_id:
              user.id

          });

    }


    if (result.error) {
      throw result.error;
    }


    $('articleMsg')
      .textContent =
      editingId

        ? 'Article updated successfully.'

        : 'Article published successfully.';


    editingId = null;


    $('articleForm')
      .reset();


    if ($('cover')) {
      $('cover').value = '';
    }


    showCoverPreview(null);


    if (button) {

      button.textContent =
        'PUBLISH ARTICLE';

    }


    await loadArticles();

    await refreshAdminStats();


  } catch (error) {

    console.error(
      'Save article error:',
      error
    );


    $('articleMsg')
      .textContent =
      error.message ||
      'Something went wrong.';


  } finally {

    if (button) {

      button.disabled = false;

      if (!editingId) {

        button.textContent =
          'PUBLISH ARTICLE';

      }

    }

  }

}


/* =========================
   EDIT ARTICLE
========================= */

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
    'TRAINING';


  $('cover').value =
    article.cover_url || '';


  $('excerpt').value =
    article.excerpt || '';


  $('content').value =
    article.content || '';


  showCoverPreview(
    article.cover_url ||
    null
  );


  $('articleSubmit')
    .textContent =
    'SAVE CHANGES';


  $('admin')
    ?.scrollIntoView({
      behavior:'smooth'
    });

}


/* =========================
   DELETE ARTICLE
========================= */

async function deleteArticle(
  id
) {

  if (
    !(await isAdmin())
  ) {

    alert(
      'Admin access required.'
    );

    return;
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
      .eq('id',id);


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
      article.cover_url
        .indexOf(marker);


    if (index !== -1) {

      const path =
        article.cover_url
          .substring(
            index +
            marker.length
          );


      try {

        await db.storage
          .from('article-images')
          .remove([path]);

      } catch (error) {

        console.warn(
          'Could not remove image:',
          error
        );

      }

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


  if (!articles.length) {

    box.innerHTML =
      `
        <p style="color:#888">
          No articles yet.
        </p>
      `;

    return;
  }


  box.innerHTML =
    articles
      .map(
        article => `

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
                'TRAINING'
              )}
            </small>

          </div>

          <div>

            <button
              type="button"
              onclick="
                editArticle(
                  ${article.id}
                )
              ">

              EDIT

            </button>

            <button
              type="button"
              class="danger"
              onclick="
                deleteArticle(
                  ${article.id}
                )
              ">

              DELETE

            </button>

          </div>

        </div>

      `
      )
      .join('');

}


/* =========================
   NEWSLETTER
========================= */

async function subscribe(
  event
) {

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

    event.target.innerHTML =
      `
        <b style="color:#ff6b6b">
          ${esc(
            error.message
          )}
        </b>
      `;

    return;
  }


  event.target.innerHTML =
    `
      <b style="color:#58c66a">
        You're subscribed.
        Welcome to Fitness Fuel! 💪
      </b>
    `;


  await refreshAdminStats();

}


/* =========================
   ARTICLE VIEW
========================= */

function openArticle(id) {

  const article =
    articles.find(
      item =>
        Number(item.id) ===
        Number(id)
    );


  if (!article) return;


  $('articleViewTitle')
    .textContent =
    article.title || '';


  $('articleViewMeta')
    .textContent =
    `${formatDate(
      article.created_at
    )} · ${
      article.category ||
      'TRAINING'
    }`;


  $('articleViewImage')
    .src =
    article.cover_url ||

    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80';


  $('articleViewContent')
    .innerHTML =
    article.content || '';


  $('articleView')
    .classList
    .remove('hidden');

}


function closeArticle() {

  $('articleView')
    ?.classList
    .add('hidden');

}


/* =========================
   CLEAR ARTICLE
========================= */

function clearArticleForm() {

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

    $('articleSubmit')
      .textContent =
      'PUBLISH ARTICLE';

  }


  if ($('articleMsg')) {

    $('articleMsg')
      .textContent = '';

  }

}


/* =========================
   VISITS
========================= */

async function trackVisit() {

  if (!db) return;


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


/* =========================
   EVENTS
========================= */

function setupEvents() {

  /*
    LOGIN
  */

  const loginBtn =
    $('loginBtn');


  if (loginBtn) {

    loginBtn.onclick =
      () => openAuth('login');

  }


  /*
    AUTH FORM
  */

  if ($('authForm')) {

    $('authForm')
      .addEventListener(
        'submit',
        handleAuth
      );

  }


  /*
    AUTH SWITCH
  */

  if ($('authSwitch')) {

    $('authSwitch')
      .addEventListener(
        'click',
        toggleAuthMode
      );

  }


  /*
    NEWSLETTER
  */

  const subscribeForm =
    $('subscribe');


  if (
    subscribeForm &&
    subscribeForm.tagName === 'FORM'
  ) {

    subscribeForm
      .addEventListener(
        'submit',
        subscribe
      );

  }


  /*
    ARTICLE FORM
  */

  if ($('articleForm')) {

    $('articleForm')
      .addEventListener(
        'submit',
        saveArticle
      );

  }


  /*
    CLEAR ARTICLE
  */

  if ($('clearArticleBtn')) {

    $('clearArticleBtn')
      .addEventListener(
        'click',
        clearArticleForm
      );

  }


  /*
    IMAGE
  */

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
            () =>
              showCoverPreview(
                reader.result
              );


          reader.readAsDataURL(
            file
          );

        }
      );

  }


  /*
    AUTH BACKDROP
  */

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


  /*
    ARTICLE BACKDROP
  */

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


  /*
    SEARCH
  */

  setupSearch();

}


/* =========================
   INIT
========================= */

async function init() {

  console.log(
    'Fitness Fuel starting...'
  );


  if (
    !initSupabase()
  ) {

    console.error(
      'Supabase could not be initialized.'
    );

    return;
  }


  setupEvents();


  await loadArticles();


  await trackVisit();


  await updateUserUI();


  console.log(
    'Fitness Fuel ready.'
  );

}


/* =========================
   START
========================= */

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
