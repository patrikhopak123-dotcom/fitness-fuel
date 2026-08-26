const SUPABASE_URL =
  'https://nyanfbaosqshqiqvxesn.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_L2uEZD5AX-AkKEuZ_YKQDw_6uH1FS6O';


/* =====================================================
   GLOBAL STATE
===================================================== */

let db = null;

let articles = [];

let editingId = null;

let authMode = 'login';

let searchOpen = false;

let showingAll = false;

let activeCategory = null;


/* =====================================================
   HELPERS
===================================================== */

const $ = id =>
  document.getElementById(id);


function esc(value = ''){

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


function formatDate(value){

  if(!value) return '';

  return new Date(value).toLocaleDateString(
    'cs-CZ',
    {
      year:'numeric',
      month:'short',
      day:'numeric'
    }
  );

}


function normalize(value = ''){

  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .trim();

}


function showToast(message, type='success'){

  let container =
    document.querySelector('.toast-container');

  if(!container){

    container =
      document.createElement('div');

    container.className =
      'toast-container';

    document.body.appendChild(container);

  }


  const toast =
    document.createElement('div');

  toast.className =
    `toast ${type === 'error' ? 'error' : ''}`;

  toast.innerHTML = `
    <strong>
      ${type === 'error' ? 'CHYBA' : 'VIRENO'}
    </strong>
    ${esc(message)}
  `;

  container.appendChild(toast);


  setTimeout(() => {

    toast.remove();

  },4000);

}


/* =====================================================
   SUPABASE
===================================================== */

function initSupabase(){

  if(!window.supabase){

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

function setupSearch(){

  const button =
    $('searchBtn');

  const input =
    $('searchInput');

  const close =
    $('searchClose');

  const overlay =
    $('searchOverlay');


  if(
    !button ||
    !input ||
    !close ||
    !overlay
  ){

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

      filterArticles(
        input.value
      );

    }
  );


  input.addEventListener(
    'keydown',
    event => {

      if(event.key === 'Escape'){

        closeSearch();

      }

    }
  );


  overlay.addEventListener(
    'click',
    event => {

      if(event.target === overlay){

        closeSearch();

      }

    }
  );

}


function openSearch(){

  const overlay =
    $('searchOverlay');

  const input =
    $('searchInput');


  if(!overlay || !input) return;


  searchOpen = true;


  overlay.classList.remove(
    'hidden'
  );


  document.body.classList.add(
    'modal-active'
  );


  setTimeout(
    () => input.focus(),
    50
  );


  renderSearchResults('');

}


function closeSearch(){

  const overlay =
    $('searchOverlay');

  const input =
    $('searchInput');


  if(!overlay || !input) return;


  searchOpen = false;

  input.value = '';

  overlay.classList.add(
    'hidden'
  );

  document.body.classList.remove(
    'modal-active'
  );


  renderSearchResults('');

}


function getSearchResults(value=''){

  const query =
    normalize(value);


  if(!query){

    return articles.slice(0,8);

  }


  const words =
    query
      .split(/\s+/)
      .filter(Boolean);


  return articles
    .map(article => {

      const searchable =
        normalize(`
          ${article.title || ''}
          ${article.category || ''}
          ${article.excerpt || ''}
          ${article.content || ''}
        `);


      let score = 0;


      words.forEach(word => {

        if(normalize(article.title).includes(word)){
          score += 10;
        }

        if(normalize(article.category).includes(word)){
          score += 7;
        }

        if(normalize(article.excerpt).includes(word)){
          score += 4;
        }

        if(normalize(article.content).includes(word)){
          score += 2;
        }

      });


      return {
        article,
        score,
        searchable
      };

    })
    .filter(item => {

      return words.every(
        word =>
          item.searchable.includes(word)
      );

    })
    .sort(
      (a,b) =>
        b.score - a.score
    )
    .map(
      item => item.article
    )
    .slice(0,12);

}


function renderSearchResults(value=''){

  const overlay =
    $('searchOverlay');


  if(!overlay) return;


  let results =
    overlay.querySelector(
      '.search-results'
    );


  if(!results){

    results =
      document.createElement('div');

    results.className =
      'search-results';

    overlay.appendChild(results);

  }


  const found =
    getSearchResults(value);


  if(!found.length){

    results.innerHTML = `
      <div class="search-result-empty">

        <strong>
          NIC JSME NENAŠLI
        </strong>

        <span>
          Zkus jiné slovo, téma nebo název článku.
        </span>

      </div>
    `;

    return;

  }


  results.innerHTML =
    found
      .map(article => {

        const image =
          article.cover_url ||
          defaultImage();


        return `
          <div
            class="search-result"
            data-search-article="${article.id}">

            <img
              src="${esc(image)}"
              alt="">

            <div>

              <b>
                ${esc(article.title)}
              </b>

              <small>
                ${esc(article.category || 'POHYB')}
                ·
                ${formatDate(article.created_at)}
              </small>

            </div>

          </div>
        `;

      })
      .join('');


  results
    .querySelectorAll(
      '[data-search-article]'
    )
    .forEach(item => {

      item.addEventListener(
        'click',
        () => {

          openArticle(
            Number(
              item.dataset.searchArticle
            )
          );

          closeSearch();

        }
      );

    });

}


function filterArticles(value=''){

  const cards =
    $('cards');


  if(!cards) return;


  const filtered =
    getSearchResults(value);


  if($('articlesHeading')){

    $('articlesHeading').textContent =
      value.trim()
        ? 'VÝSLEDKY VYHLEDÁVÁNÍ'
        : 'NEJNOVĚJŠÍ ČLÁNKY';

  }


  if(!value.trim()){

    renderArticles();

    renderSearchResults('');

    return;

  }


  if(!filtered.length){

    cards.innerHTML = `
      <div class="no-results">

        <strong>
          NIC JSME NENAŠLI
        </strong>

        <span>
          Zkuste jiný název nebo téma.
        </span>

      </div>
    `;

    renderSearchResults(value);

    return;

  }


  cards.innerHTML =
    filtered
      .map(card)
      .join('');


  renderSearchResults(value);

}


/* =====================================================
   AUTH
===================================================== */

function openAuth(mode='login'){

  authMode = mode;

  const auth =
    $('auth');


  if(!auth) return;


  auth.classList.remove(
    'hidden'
  );


  document.body.classList.add(
    'modal-active'
  );


  if($('authTitle')){

    $('authTitle').textContent =
      mode === 'signup'
        ? 'VYTVOŘIT ÚČET'
        : 'PŘIHLÁSIT SE';

  }


  if($('authSubmit')){

    $('authSubmit').textContent =
      mode === 'signup'
        ? 'VYTVOŘIT ÚČET'
        : 'PŘIHLÁSIT SE';

  }


  if($('authSwitch')){

    $('authSwitch').textContent =
      mode === 'signup'
        ? 'Už máte účet? Přihlaste se'
        : 'Nemáte účet? Vytvořte si ho';

  }


  if($('authMsg')){

    $('authMsg').textContent = '';

  }


  setTimeout(
    () => $('authEmail')?.focus(),
    50
  );

}


function closeAuth(){

  $('auth')?.classList.add(
    'hidden'
  );

  document.body.classList.remove(
    'modal-active'
  );

}


function toggleAuthMode(){

  openAuth(
    authMode === 'login'
      ? 'signup'
      : 'login'
  );

}


async function handleAuth(event){

  event.preventDefault();


  if(!db){

    $('authMsg').textContent =
      'Spojení se serverem není dostupné.';

    return;

  }


  const email =
    $('authEmail')
      .value
      .trim()
      .toLowerCase();


  const password =
    $('authPassword')
      .value;


  if(!email || !password){

    $('authMsg').textContent =
      'Vyplňte e-mail a heslo.';

    return;

  }


  $('authMsg').textContent =
    'Pracuji...';


  try{

    if(authMode === 'signup'){

      const {
        data,
        error
      } =
        await db.auth.signUp({
          email,
          password
        });


      if(error){

        $('authMsg').textContent =
          error.message;

        return;

      }


      if(data.session){

        $('authMsg').textContent =
          'Účet byl vytvořen.';

        setTimeout(
          async () => {

            closeAuth();

            await updateUserUI();

          },
          700
        );

      }else{

        $('authMsg').textContent =
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


    if(error){

      $('authMsg').textContent =
        error.message;

      return;

    }


    closeAuth();

    await updateUserUI();

    showToast(
      'Úspěšně jste se přihlásili.'
    );


  }catch(error){

    console.error(
      'Chyba přihlášení:',
      error
    );


    $('authMsg').textContent =
      error.message ||
      'Přihlášení se nepodařilo.';

  }

}


async function logout(){

  if(!db) return;


  await db.auth.signOut();

  await updateUserUI();

  showToast(
    'Byli jste odhlášeni.'
  );

}


/* =====================================================
   PROFILE / ADMIN
===================================================== */

async function getProfile(userId){

  if(!db || !userId) return null;


  const {
    data,
    error
  } =
    await db
      .from('profiles')
      .select('role')
      .eq('id',userId)
      .maybeSingle();


  if(error){

    console.error(
      'Chyba profilu:',
      error
    );

    return null;

  }


  return data;

}


async function isAdmin(){

  if(!db) return false;


  const {
    data:{
      user
    }
  } =
    await db.auth.getUser();


  if(!user) return false;


  const profile =
    await getProfile(user.id);


  return profile?.role === 'admin';

}


async function updateUserUI(){

  if(!db) return;


  try{

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


    if(!user){

      if(loginBtn){

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
      await getProfile(user.id);


    if(loginBtn){

      loginBtn.textContent =
        'ODHLÁSIT SE';

      loginBtn.onclick =
        logout;

    }


    if(profile?.role === 'admin'){

      admin?.classList.remove(
        'hidden'
      );

      await refreshAdminStats();

    }else{

      admin?.classList.add(
        'hidden'
      );

    }

  }catch(error){

    console.error(
      'Chyba uživatelského rozhraní:',
      error
    );

  }

}


/* =====================================================
   ARTICLE
===================================================== */

function defaultImage(){

  return 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80';

}


function card(article){

  const image =
    article.cover_url ||
    defaultImage();


  return `
    <article
      class="card"
      onclick="openArticle(${article.id})">

      <div
        class="card-img"
        style="background-image:url('${esc(image)}')">
      </div>

      <div class="card-body">

        <span class="tag">
          ${esc(article.category || 'POHYB')}
        </span>

        <h3>
          ${esc(article.title)}
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
            onclick="
              event.stopPropagation();
              openArticle(${article.id});
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
   CATEGORY FILTER
===================================================== */

const CATEGORY_INFO = {

  'POHYB':{
    icon:'🏃',
    description:
      'Trénink, cvičení, výkon, síla, kondice a aktivní životní styl.'
  },

  'VÝŽIVA':{
    icon:'🥗',
    description:
      'Jídlo, makroživiny, kalorie, recepty a praktické tipy pro lepší stravování.'
  },

  'HUBNUTÍ':{
    icon:'🔥',
    description:
      'Hubnutí, kalorický deficit, práce s příjmem a dlouhodobě udržitelná forma.'
  },

  'REGENERACE':{
    icon:'😴',
    description:
      'Spánek, odpočinek, regenerace, mobilita a návrat po náročném tréninku.'
  },

  'ZDRAVÍ':{
    icon:'❤️',
    description:
      'Zdraví, prevence, každodenní návyky a dlouhodobá péče o tělo.'
  }

};


function getCategoryFromText(value=''){

  const normalized =
    normalize(value);


  const categories =
    Object.keys(CATEGORY_INFO);


  return categories.find(
    category =>
      normalize(category) === normalized
  ) || null;

}


function setupCategories(){

  document
    .querySelectorAll(
      '.category-card'
    )
    .forEach(cardElement => {

      const text =
        cardElement.innerText
          .trim();


      const category =
        getCategoryFromText(text);


      if(!category) return;


      cardElement.dataset.category =
        category;


      cardElement.addEventListener(
        'click',
        event => {

          event.preventDefault();

          filterCategory(
            category
          );

        }
      );

    });


  document
    .querySelectorAll(
      '.desktop-nav a'
    )
    .forEach(link => {

      const category =
        getCategoryFromText(
          link.textContent
        );


      if(!category) return;


      link.dataset.category =
        category;


      link.addEventListener(
        'click',
        event => {

          event.preventDefault();

          filterCategory(
            category
          );

        }
      );

    });

}


function filterCategory(category){

  activeCategory =
    category;


  showingAll = true;


  const normalized =
    normalize(category);


  const filtered =
    articles.filter(
      article =>
        normalize(
          article.category || ''
        ) === normalized
    );


  document
    .querySelectorAll(
      '.category-card'
    )
    .forEach(element => {

      element.classList.toggle(
        'active',
        normalize(
          element.dataset.category || ''
        ) === normalized
      );

    });


  document
    .querySelectorAll(
      '.desktop-nav a'
    )
    .forEach(element => {

      element.classList.toggle(
        'active',
        normalize(
          element.dataset.category || ''
        ) === normalized
      );

    });


  renderCategoryHeader(
    category,
    filtered.length
  );


  renderFilteredArticles(
    filtered,
    `${category} – ČLÁNKY`
  );


  document
    .getElementById('articles')
    ?.scrollIntoView({
      behavior:'smooth',
      block:'start'
    });

}


function renderCategoryHeader(
  category,
  count
){

  let view =
    $('categoryView');


  if(!view){

    view =
      document.createElement('section');

    view.id =
      'categoryView';

    view.className =
      'category-view';


    const content =
      document.querySelector('.content');


    if(content){

      content.parentNode.insertBefore(
        view,
        content
      );

    }else{

      document.body.prepend(
        view
      );

    }

  }


  const info =
    CATEGORY_INFO[category] ||
    {
      icon:'•',
      description:''
    };


  view.innerHTML = `
    <div class="category-view-inner">

      <div>

        <div class="kicker">
          ${info.icon} KATEGORIE
        </div>

        <h2>
          ${esc(category)}
        </h2>

        <p>
          ${esc(info.description)}
          <br>
          <strong>
            ${count} ${count === 1 ? 'článek' : 'článků'}
          </strong>
        </p>

      </div>

      <button
        type="button"
        class="category-back"
        id="categoryBack">

        VŠECHNY ČLÁNKY

      </button>

    </div>
  `;


  $('categoryBack')
    ?.addEventListener(
      'click',
      clearCategory
    );

}


function clearCategory(){

  activeCategory =
    null;

  showingAll =
    false;


  document
    .querySelectorAll(
      '.category-card'
    )
    .forEach(element =>
      element.classList.remove(
        'active'
      )
    );


  document
    .querySelectorAll(
      '.desktop-nav a'
    )
    .forEach(element =>
      element.classList.remove(
        'active'
      )
    );


  $('categoryView')
    ?.remove();


  renderArticles();


  document
    .getElementById('articles')
    ?.scrollIntoView({
      behavior:'smooth',
      block:'start'
    });

}


function renderFilteredArticles(
  list,
  heading='ČLÁNKY'
){

  const cards =
    $('cards');


  if(!cards) return;


  if($('articlesHeading')){

    $('articlesHeading').textContent =
      heading;

  }


  if(!list.length){

    cards.innerHTML = `
      <div class="no-results">

        <strong>
          ZATÍM NIC
        </strong>

        <span>
          V této kategorii zatím nejsou žádné články.
        </span>

      </div>
    `;

    return;

  }


  cards.innerHTML =
    list
      .map(card)
      .join('');

}


/* =====================================================
   RENDER
===================================================== */

function renderArticles(){

  const cards =
    $('cards');


  const drawer =
    $('drawerArticles');


  if(activeCategory){

    const filtered =
      articles.filter(
        article =>
          normalize(
            article.category || ''
          ) === normalize(
            activeCategory
          )
      );


    renderFilteredArticles(
      filtered,
      `${activeCategory} – ČLÁNKY`
    );


    return;

  }


  const visible =
    showingAll
      ? articles
      : articles.slice(0,4);


  if(cards){

    if(visible.length){

      cards.innerHTML =
        visible
          .map(card)
          .join('');

    }else{

      cards.innerHTML = `
        <div class="no-results">

          <strong>
            ZATÍM ZDE NEJSOU ŽÁDNÉ ČLÁNKY
          </strong>

        </div>
      `;

    }

  }


  if($('articlesHeading')){

    $('articlesHeading').textContent =
      showingAll
        ? 'VŠECHNY ČLÁNKY'
        : 'NEJNOVĚJŠÍ ČLÁNKY';

  }


  if($('showAllArticles')){

    $('showAllArticles').textContent =
      showingAll
        ? 'ZOBRAZIT MÉNĚ'
        : 'VŠECHNY ČLÁNKY';

  }


  if(drawer){

    if(!articles.length){

      drawer.innerHTML =
        '<p class="muted">Zatím nejsou žádné články.</p>';

    }else{

      drawer.innerHTML =
        articles
          .slice(0,10)
          .map(article => `

            <div
              class="drawer-item"
              onclick="
                openArticle(${article.id});
                toggleDrawer();
              ">

              ${
                article.cover_url
                  ? `
                    <img
                      src="${esc(article.cover_url)}"
                      alt="">
                  `
                  : ''
              }

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

    }

  }


  renderAdminList();

}


/* =====================================================
   LOAD ARTICLES
===================================================== */

async function loadArticles(){

  if(!db) return;


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


  if(error){

    console.error(
      'Články se nepodařilo načíst:',
      error
    );


    if($('cards')){

      $('cards').innerHTML = `
        <div class="no-results">

          <strong>
            ČLÁNKY SE NEPODAŘILO NAČÍST
          </strong>

          <span>
            Zkuste stránku obnovit.
          </span>

        </div>
      `;

    }

    return;

  }


  articles =
    data || [];


  renderArticles();


  if($('adminArticles')){

    $('adminArticles').textContent =
      articles.length;

  }


  if($('publicArticles')){

    $('publicArticles').textContent =
      articles.length;

  }

}


/* =====================================================
   ALL ARTICLES
===================================================== */

function setupAllArticles(){

  const button =
    $('showAllArticles');


  if(!button) return;


  button.addEventListener(
    'click',
    () => {

      if(activeCategory){

        clearCategory();

        return;

      }


      showingAll =
        !showingAll;


      renderArticles();


      document
        .getElementById('articles')
        ?.scrollIntoView({
          behavior:'smooth',
          block:'start'
        });

    }
  );

}


/* =====================================================
   DRAWER
===================================================== */

function toggleDrawer(){

  $('drawer')
    ?.classList
    .toggle('open');

}


/* =====================================================
   STATS
===================================================== */

async function refreshAdminStats(){

  if(!db) return;


  try{

    const {
      count:subscribers
    } =
      await db
        .from('subscribers')
        .select('*',{
          count:'exact',
          head:true
        });


    const {
      data:stats
    } =
      await db
        .from('site_stats')
        .select('visits')
        .eq('id',1)
        .maybeSingle();


    if($('subs')){

      $('subs').textContent =
        subscribers ?? 0;

    }


    if($('adminArticles')){

      $('adminArticles').textContent =
        articles.length;

    }


    if($('visits')){

      $('visits').textContent =
        stats?.visits ?? 0;

    }

  }catch(error){

    console.error(
      'Chyba statistik:',
      error
    );

  }

}


/* =====================================================
   IMAGE UPLOAD
===================================================== */

async function uploadCoverImage(file){

  if(!file) return null;


  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];


  if(!allowed.includes(file.type)){

    throw new Error(
      'Použijte JPG, PNG nebo WEBP.'
    );

  }


  if(file.size > 5 * 1024 * 1024){

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


  if(!user){

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


  if(error){
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


/* =====================================================
   PREVIEW
===================================================== */

function showCoverPreview(url){

  const preview =
    $('coverPreview');


  const image =
    $('coverPreviewImg');


  if(!preview || !image) return;


  if(!url){

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

async function saveArticle(event){

  event.preventDefault();


  if(!(await isAdmin())){

    if($('articleMsg')){

      $('articleMsg').textContent =
        'Přístup mají pouze administrátoři.';

    }

    return;

  }


  const button =
    $('articleSubmit');


  if(button){

    button.disabled = true;

    button.textContent =
      'UKLÁDÁM...';

  }


  try{

    let coverUrl =
      $('cover')
        ?.value
        .trim() ||
      null;


    const file =
      $('coverFile')
        ?.files?.[0];


    if(file){

      if($('articleMsg')){

        $('articleMsg').textContent =
          'Nahrávám obrázek...';

      }


      coverUrl =
        await uploadCoverImage(file);

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


    if(!payload.title){

      throw new Error(
        'Zadejte název článku.'
      );

    }


    if(!payload.content){

      throw new Error(
        'Zadejte obsah článku.'
      );

    }


    let result;


    if(editingId){

      result =
        await db
          .from('articles')
          .update(payload)
          .eq('id',editingId);

    }else{

      const {
        data:{
          user
        }
      } =
        await db.auth.getUser();


      if(!user){

        throw new Error(
          'Musíte být přihlášeni.'
        );

      }


      result =
        await db
          .from('articles')
          .insert({
            ...payload,
            author_id:user.id
          });

    }


    if(result.error){
      throw result.error;
    }


    const wasEditing =
      Boolean(editingId);


    editingId = null;


    $('articleForm').reset();


    if($('cover')){

      $('cover').value = '';

    }


    if($('coverFile')){

      $('coverFile').value = '';

    }


    showCoverPreview(null);


    if(button){

      button.textContent =
        'PUBLIKOVAT ČLÁNEK';

    }


    if($('articleMsg')){

      $('articleMsg').textContent =
        wasEditing
          ? 'Článek byl upraven.'
          : 'Článek byl publikován.';

    }


    showToast(
      wasEditing
        ? 'Článek byl upraven.'
        : 'Článek byl publikován.'
    );


    await loadArticles();

    await refreshAdminStats();


  }catch(error){

    console.error(
      'Chyba při ukládání:',
      error
    );


    if($('articleMsg')){

      $('articleMsg').textContent =
        error.message ||
        'Něco se nepodařilo.';

    }


    showToast(
      error.message ||
      'Něco se nepodařilo.',
      'error'
    );

  }finally{

    if(button){

      button.disabled = false;

      if(!editingId){

        button.textContent =
          'PUBLIKOVAT ČLÁNEK';

      }

    }

  }

}


/* =====================================================
   EDIT
===================================================== */

function editArticle(id){

  const article =
    articles.find(
      item =>
        Number(item.id) ===
        Number(id)
    );


  if(!article) return;


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
   DELETE
===================================================== */

async function deleteArticle(id){

  if(!(await isAdmin())){

    showToast(
      'Přístup mají pouze administrátoři.',
      'error'
    );

    return;

  }


  if(!confirm(
    'Opravdu chcete tento článek smazat?'
  )){

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


  if(error){

    showToast(
      error.message,
      'error'
    );

    return;

  }


  if(article?.cover_url){

    const marker =
      '/storage/v1/object/public/article-images/';


    const index =
      article.cover_url.indexOf(
        marker
      );


    if(index !== -1){

      const path =
        article.cover_url.substring(
          index + marker.length
        );


      try{

        await db.storage
          .from('article-images')
          .remove([path]);

      }catch(error){

        console.warn(
          'Obrázek se nepodařilo odstranit:',
          error
        );

      }

    }

  }


  await loadArticles();

  await refreshAdminStats();


  showToast(
    'Článek byl smazán.'
  );

}


/* =====================================================
   ADMIN LIST
===================================================== */

function renderAdminList(){

  const box =
    $('adminList');


  if(!box) return;


  if(!articles.length){

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
              onclick="editArticle(${article.id})">

              UPRAVIT

            </button>

            <button
              type="button"
              class="danger"
              onclick="deleteArticle(${article.id})">

              SMAZAT

            </button>

          </div>

        </div>

      `)
      .join('');

}


/* =====================================================
   NEWSLETTER
===================================================== */

async function subscribe(event){

  event.preventDefault();


  if(!db) return;


  const form =
    event.target;


  const input =
    form.querySelector(
      'input[type=email]'
    );


  const email =
    input?.value
      .trim()
      .toLowerCase();


  if(!email){

    showToast(
      'Zadejte e-mail.',
      'error'
    );

    return;

  }


  const {
    error
  } =
    await db
      .from('subscribers')
      .insert({
        email
      });


  if(
    error &&
    !String(error.message)
      .toLowerCase()
      .includes('duplicate')
  ){

    showToast(
      error.message,
      'error'
    );

    return;

  }


  form.innerHTML =
    `
      <b class="success-text">
        Jste přihlášeni. Vítejte ve Vireno!
      </b>
    `;


  showToast(
    'Newsletter byl aktivován.'
  );


  await refreshAdminStats();

}


/* =====================================================
   ARTICLE VIEW
===================================================== */

function openArticle(id){

  const article =
    articles.find(
      item =>
        Number(item.id) ===
        Number(id)
    );


  if(!article) return;


  if($('articleViewTitle')){

    $('articleViewTitle').textContent =
      article.title || '';

  }


  if($('articleViewMeta')){

    $('articleViewMeta').textContent =
      `${formatDate(article.created_at)} · ${article.category || 'POHYB'}`;

  }


  if($('articleViewImage')){

    $('articleViewImage').src =
      article.cover_url ||
      defaultImage();

  }


  if($('articleViewContent')){

    $('articleViewContent').innerHTML =
      article.content || '';

  }


  $('articleView')
    ?.classList
    .remove('hidden');


  document.body.classList.add(
    'modal-active'
  );

}


function closeArticle(){

  $('articleView')
    ?.classList
    .add('hidden');


  document.body.classList.remove(
    'modal-active'
  );

}


/* =====================================================
   CLEAR FORM
===================================================== */

function clearArticleForm(){

  editingId = null;


  $('articleForm')?.reset();


  if($('cover')){

    $('cover').value = '';

  }


  if($('coverFile')){

    $('coverFile').value = '';

  }


  showCoverPreview(null);


  if($('articleSubmit')){

    $('articleSubmit').textContent =
      'PUBLIKOVAT ČLÁNEK';

  }


  if($('articleMsg')){

    $('articleMsg').textContent = '';

  }

}


/* =====================================================
   VISITS
===================================================== */

async function trackVisit(){

  if(!db) return;


  try{

    await db.rpc(
      'track_page_view'
    );

  }catch(error){

    console.warn(
      'Sledování návštěvy selhalo:',
      error
    );

  }

}


/* =====================================================
   CALCULATORS
===================================================== */

function calculateBMI(){

  const height =
    Number(
      $('bmiHeight')?.value
    );


  const weight =
    Number(
      $('bmiWeight')?.value
    );


  const result =
    $('bmiResult');


  if(!height || !weight){

    if(result){

      result.innerHTML =
        'Zadejte výšku a hmotnost.';

    }

    return;

  }


  if(height < 100 || height > 250){

    result.innerHTML =
      'Výška musí být mezi 100–250 cm.';

    return;

  }


  if(weight < 20 || weight > 300){

    result.innerHTML =
      'Hmotnost musí být mezi 20–300 kg.';

    return;

  }


  const meters =
    height / 100;


  const bmi =
    weight /
    (meters * meters);


  let category =
    'Normální hmotnost';


  if(bmi < 18.5){

    category =
      'Podváha';

  }else if(bmi >= 25 && bmi < 30){

    category =
      'Nadváha';

  }else if(bmi >= 30){

    category =
      'Obezita';

  }


  result.innerHTML = `
    <strong>
      BMI ${bmi.toFixed(1)}
    </strong>

    ${category}

    <br>

    <small>
      BMI je orientační ukazatel a samo o sobě neurčuje zdravotní stav.
    </small>
  `;

}


function calculateCalories(type){

  const weight =
    Number(
      $('calWeight')?.value
    );


  const height =
    Number(
      $('calHeight')?.value
    );


  const age =
    Number(
      $('calAge')?.value
    );


  const gender =
    $('calGender')?.value ||
    'male';


  const activity =
    Number(
      $('calActivity')?.value
    );


  const result =
    $('calorieResult');


  if(
    !weight ||
    !height ||
    !age
  ){

    if(result){

      result.innerHTML =
        'Vyplňte všechny údaje.';

    }

    return;

  }


  let bmr;


  if(gender === 'female'){

    bmr =
      10 * weight +
      6.25 * height -
      5 * age -
      161;

  }else{

    bmr =
      10 * weight +
      6.25 * height -
      5 * age +
      5;

  }


  const maintenance =
    Math.round(
      bmr * activity
    );


  let calories =
    maintenance;


  let label =
    'Udržovací příjem';


  if(type === 'cut'){

    calories =
      Math.round(
        maintenance * 0.80
      );

    label =
      'Doporučený start pro cut';

  }


  if(type === 'bulk'){

    calories =
      Math.round(
        maintenance * 1.10
      );

    label =
      'Doporučený start pro bulk';

  }


  if(result){

    result.innerHTML = `
      <strong>
        ${calories.toLocaleString('cs-CZ')} kcal
      </strong>

      ${label}

      <br>

      <small>
        Odhad maintenance:
        ${maintenance.toLocaleString('cs-CZ')} kcal/den.
      </small>
    `;

  }

}


function createCalculatorSection(){

  if(
    document.querySelector(
      '.calculators-section'
    )
  ){

    return;

  }


  const section =
    document.createElement('section');


  section.className =
    'calculators-section';


  section.id =
    'kalkulacky';


  section.innerHTML = `

    <div class="calculators-heading">

      <div class="kicker">
        PRAKTICKÉ NÁSTROJE
      </div>

      <h2>
        KALKULAČKY PRO TVŮJ CÍL
      </h2>

    </div>


    <div class="calculators-grid">


      <!-- BMI -->

      <div class="calculator">

        <div class="calculator-icon">
          ⚖️
        </div>

        <h3>
          BMI
        </h3>

        <p>
          Orientační výpočet BMI podle výšky a hmotnosti.
        </p>

        <label>
          Výška (cm)
        </label>

        <input
          id="bmiHeight"
          type="number"
          min="100"
          max="250"
          placeholder="180">

        <label>
          Hmotnost (kg)
        </label>

        <input
          id="bmiWeight"
          type="number"
          min="20"
          max="300"
          placeholder="80">

        <button
          type="button"
          class="btn green"
          id="bmiCalculate">

          VYPOČÍTAT BMI

        </button>

        <div
          id="bmiResult"
          class="calc-result">

          Výsledek se zobrazí zde.

        </div>

      </div>


      <!-- MAINTENANCE -->

      <div class="calculator">

        <div class="calculator-icon">
          🔄
        </div>

        <h3>
          MAINTENANCE
        </h3>

        <p>
          Odhad denního energetického příjmu pro udržení hmotnosti.
        </p>

        <label>
          Pohlaví
        </label>

        <select id="calGender">

          <option value="male">
            Muž
          </option>

          <option value="female">
            Žena
          </option>

        </select>

        <label>
          Věk
        </label>

        <input
          id="calAge"
          type="number"
          min="15"
          max="100"
          placeholder="25">

        <label>
          Výška (cm)
        </label>

        <input
          id="calHeight"
          type="number"
          placeholder="180">

        <label>
          Hmotnost (kg)
        </label>

        <input
          id="calWeight"
          type="number"
          placeholder="80">

        <label>
          Aktivita
        </label>

        <select id="calActivity">

          <option value="1.2">
            Sedavý režim
          </option>

          <option value="1.375">
            Lehká aktivita
          </option>

          <option value="1.55">
            Střední aktivita
          </option>

          <option value="1.725">
            Vysoká aktivita
          </option>

          <option value="1.9">
            Velmi vysoká aktivita
          </option>

        </select>

        <button
          type="button"
          class="btn green"
          id="maintenanceCalculate">

          VYPOČÍTAT

        </button>

        <div
          id="calorieResult"
          class="calc-result">

          Výsledek se zobrazí zde.

        </div>

      </div>


      <!-- CUT -->

      <div class="calculator">

        <div class="calculator-icon">
          🔥
        </div>

        <h3>
          CUT
        </h3>

        <p>
          Odhad startovního příjmu pro kalorický deficit.
        </p>

        <label>
          Pohlaví
        </label>

        <select id="cutGender">

          <option value="male">
            Muž
          </option>

          <option value="female">
            Žena
          </option>

        </select>

        <label>
          Věk
        </label>

        <input
          id="cutAge"
          type="number"
          placeholder="25">

        <label>
          Výška (cm)
        </label>

        <input
          id="cutHeight"
          type="number"
          placeholder="180">

        <label>
          Hmotnost (kg)
        </label>

        <input
          id="cutWeight"
          type="number"
          placeholder="80">

        <label>
          Aktivita
        </label>

        <select id="cutActivity">

          <option value="1.2">
            Sedavý režim
          </option>

          <option value="1.375">
            Lehká aktivita
          </option>

          <option value="1.55">
            Střední aktivita
          </option>

          <option value="1.725">
            Vysoká aktivita
          </option>

          <option value="1.9">
            Velmi vysoká aktivita
          </option>

        </select>

        <button
          type="button"
          class="btn green"
          id="cutCalculate">

          VYPOČÍTAT CUT

        </button>

        <div
          id="cutResult"
          class="calc-result">

          Výsledek se zobrazí zde.

        </div>

      </div>


      <!-- BULK -->

      <div class="calculator">

        <div class="calculator-icon">
          💪
        </div>

        <h3>
          BULK
        </h3>

        <p>
          Odhad startovního příjmu pro kontrolovaný kalorický nadbytek.
        </p>

        <label>
          Pohlaví
        </label>

        <select id="bulkGender">

          <option value="male">
            Muž
          </option>

          <option value="female">
            Žena
          </option>

        </select>

        <label>
          Věk
        </label>

        <input
          id="bulkAge"
          type="number"
          placeholder="25">

        <label>
          Výška (cm)
        </label>

        <input
          id="bulkHeight"
          type="number"
          placeholder="180">

        <label>
          Hmotnost (kg)
        </label>

        <input
          id="bulkWeight"
          type="number"
          placeholder="80">

        <label>
          Aktivita
        </label>

        <select id="bulkActivity">

          <option value="1.2">
            Sedavý režim
          </option>

          <option value="1.375">
            Lehká aktivita
          </option>

          <option value="1.55">
            Střední aktivita
          </option>

          <option value="1.725">
            Vysoká aktivita
          </option>

          <option value="1.9">
            Velmi vysoká aktivita
          </option>

        </select>

        <button
          type="button"
          class="btn green"
          id="bulkCalculate">

          VYPOČÍTAT BULK

        </button>

        <div
          id="bulkResult"
          class="calc-result">

          Výsledek se zobrazí zde.

        </div>

      </div>

    </div>

  `;


  const footer =
    document.querySelector(
      '.footer'
    );


  if(footer){

    footer.parentNode.insertBefore(
      section,
      footer
    );

  }else{

    document.body.appendChild(
      section
    );

  }


  setupCalculatorEvents();

}


function calculateStandalone(
  prefix,
  multiplier,
  resultId,
  label
){

  const weight =
    Number(
      $(`${prefix}Weight`)?.value
    );


  const height =
    Number(
      $(`${prefix}Height`)?.value
    );


  const age =
    Number(
      $(`${prefix}Age`)?.value
    );


  const gender =
    $(`${prefix}Gender`)?.value ||
    'male';


  const activity =
    Number(
      $(`${prefix}Activity`)?.value
    );


  const result =
    $(resultId);


  if(
    !weight ||
    !height ||
    !age
  ){

    if(result){

      result.innerHTML =
        'Vyplňte všechny údaje.';

    }

    return;

  }


  let bmr;


  if(gender === 'female'){

    bmr =
      10 * weight +
      6.25 * height -
      5 * age -
      161;

  }else{

    bmr =
      10 * weight +
      6.25 * height -
      5 * age +
      5;

  }


  const maintenance =
    Math.round(
      bmr * activity
    );


  const calories =
    Math.round(
      maintenance * multiplier
    );


  if(result){

    result.innerHTML = `
      <strong>
        ${calories.toLocaleString('cs-CZ')} kcal
      </strong>

      ${label}

      <br>

      <small>
        Odhad maintenance:
        ${maintenance.toLocaleString('cs-CZ')} kcal/den.
      </small>
    `;

  }

}


function setupCalculatorEvents(){

  $('bmiCalculate')
    ?.addEventListener(
      'click',
      calculateBMI
    );


  $('maintenanceCalculate')
    ?.addEventListener(
      'click',
      () => {

        calculateCalories(
          'maintenance'
        );

      }
    );


  $('cutCalculate')
    ?.addEventListener(
      'click',
      () => {

        calculateStandalone(
          'cut',
          .80,
          'cutResult',
          'Doporučený start pro cut'
        );

      }
    );


  $('bulkCalculate')
    ?.addEventListener(
      'click',
      () => {

        calculateStandalone(
          'bulk',
          1.10,
          'bulkResult',
          'Doporučený start pro bulk'
        );

      }
    );

}


/* =====================================================
   MOBILE MENU
===================================================== */

function setupMobileMenu(){

  const menu =
    $('menuBtn');


  if(!menu) return;


  menu.addEventListener(
    'click',
    toggleDrawer
  );


  document
    .querySelectorAll(
      '.mobile-nav a'
    )
    .forEach(link => {

      const category =
        getCategoryFromText(
          link.textContent
        );


      if(category){

        link.addEventListener(
          'click',
          event => {

            event.preventDefault();

            filterCategory(
              category
            );

            toggleDrawer();

          }
        );

      }

    });

}


/* =====================================================
   EVENTS
===================================================== */

function setupEvents(){

  const loginBtn =
    $('loginBtn');


  if(loginBtn){

    loginBtn.onclick =
      () => openAuth('login');

  }


  $('authForm')
    ?.addEventListener(
      'submit',
      handleAuth
    );


  $('authSwitch')
    ?.addEventListener(
      'click',
      toggleAuthMode
    );


  $('subscribe')
    ?.addEventListener(
      'submit',
      subscribe
    );


  $('articleForm')
    ?.addEventListener(
      'submit',
      saveArticle
    );


  $('clearArticleBtn')
    ?.addEventListener(
      'click',
      clearArticleForm
    );


  $('coverFile')
    ?.addEventListener(
      'change',
      event => {

        const file =
          event.target.files?.[0];


        if(!file) return;


        const reader =
          new FileReader();


        reader.onload =
          () =>
            showCoverPreview(
              reader.result
            );


        reader.readAsDataURL(file);

      }
    );


  $('auth')
    ?.addEventListener(
      'click',
      event => {

        if(
          event.target ===
          $('auth')
        ){

          closeAuth();

        }

      }
    );


  $('articleView')
    ?.addEventListener(
      'click',
      event => {

        if(
          event.target ===
          $('articleView')
        ){

          closeArticle();

        }

      }
    );


  setupSearch();

  setupAllArticles();

  setupCategories();

  setupMobileMenu();

  createCalculatorSection();


  document.addEventListener(
    'keydown',
    event => {

      if(
        event.key !== 'Escape'
      ){

        return;

      }


      if(searchOpen){

        closeSearch();

      }


      if(
        !$('articleView')
          ?.classList
          .contains('hidden')
      ){

        closeArticle();

      }


      if(
        !$('auth')
          ?.classList
          .contains('hidden')
      ){

        closeAuth();

      }

    }
  );

}


/* =====================================================
   AUTH STATE
===================================================== */

function setupAuthListener(){

  if(!db) return;


  db.auth.onAuthStateChange(
    async () => {

      await updateUserUI();

    }
  );

}


/* =====================================================
   INIT
===================================================== */

async function init(){

  console.log(
    'Vireno se spouští...'
  );


  if(!initSupabase()){

    console.error(
      'Supabase se nepodařilo inicializovat.'
    );

    return;

  }


  setupEvents();

  setupAuthListener();


  await loadArticles();


  await trackVisit();


  await updateUserUI();


  console.log(
    'Vireno je připraveno.'
  );

}


if(
  document.readyState ===
  'loading'
){

  document.addEventListener(
    'DOMContentLoaded',
    init
  );

}else{

  init();

}
