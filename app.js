const SUPABASE_URL =
  'https://nyanfbaosqshqiqvxesn.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_L2uEZD5AX-AkKEuZ_YKQDw_6uH1FS6O';


let db = null;
let articles = [];
let editingId = null;
let authMode = 'login';
let searchOpen = false;
let currentView = 'home';


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
   NAVIGATION
===================================================== */

function hideMainViews(){

  $('homeView')?.classList.add('hidden');
  $('articlePage')?.classList.add('hidden');
  $('calculatorPage')?.classList.add('hidden');

}


function setActiveCategory(category = ''){

  document
    .querySelectorAll('.desktop-nav a')
    .forEach(link => {

      link.classList.toggle(
        'active',
        link.dataset.category === category
      );

    });

}


function showHome(){

  currentView = 'home';

  hideMainViews();

  $('homeView')?.classList.remove('hidden');

  setActiveCategory('');

  window.scrollTo({
    top:0,
    behavior:'smooth'
  });

}


function showAllArticles(){

  currentView = 'articles';

  hideMainViews();

  $('articlePage')?.classList.remove('hidden');

  setActiveCategory('');

  renderArticlePage(
    articles,
    'VŠECHNY ČLÁNKY',
    'Přehled všech článků ve VIRENO magazínu.'
  );

  window.scrollTo({
    top:0,
    behavior:'smooth'
  });

}


function showCategory(category){

  currentView = 'category';

  hideMainViews();

  $('articlePage')?.classList.remove('hidden');

  setActiveCategory(category);

  const filtered =
    articles.filter(article =>
      String(article.category || '')
        .toUpperCase()
        .trim() ===
      String(category || '')
        .toUpperCase()
        .trim()
    );

  renderArticlePage(
    filtered,
    category,
    `Články zaměřené na téma ${category.toLowerCase()}.`
  );

  window.scrollTo({
    top:0,
    behavior:'smooth'
  });

}


function showCalculators(){

  currentView = 'calculators';

  hideMainViews();

  $('calculatorPage')?.classList.remove('hidden');

  setActiveCategory('');

  window.scrollTo({
    top:0,
    behavior:'smooth'
  });

}


/* =====================================================
   ARTICLE PAGE
===================================================== */

function renderArticlePage(
  list,
  title,
  description
){

  const box =
    $('pageCards');

  if($('pageArticlesTitle')){
    $('pageArticlesTitle').textContent =
      title;
  }

  if($('pageArticlesDescription')){
    $('pageArticlesDescription').textContent =
      description;
  }

  if(!box) return;

  if(!list.length){

    box.innerHTML = `
      <div class="no-results">
        <strong>
          Zatím zde nejsou žádné články.
        </strong>

        <span>
          Jakmile bude přidán nový článek,
          zobrazí se zde.
        </span>
      </div>
    `;

    return;
  }

  box.innerHTML =
    list
      .map(card)
      .join('');

}


/* =====================================================
   ARTICLE CARD
===================================================== */

function card(article){

  const image =
    article.cover_url ||
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80';

  return `
    <article
      class="card"
      onclick="openArticle(${Number(article.id)})"
    >

      <div
        class="card-img"
        style="background-image:url('${esc(image)}')"
      ></div>

      <div class="card-body">

        <span class="tag">
          ${esc(article.category || 'ZDRAVÍ')}
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
            onclick="
              event.stopPropagation();
              openArticle(${Number(article.id)});
              return false;
            "
          >
            ČÍST →
          </a>

        </div>

      </div>

    </article>
  `;

}


/* =====================================================
   HOME ARTICLES
===================================================== */

function renderHomeArticles(){

  const cards =
    $('cards');

  if(!cards) return;

  const visible =
    articles.slice(0,4);

  if(!visible.length){

    cards.innerHTML = `
      <div class="no-results">
        <strong>
          Zatím zde nejsou žádné články.
        </strong>
      </div>
    `;

    return;
  }

  cards.innerHTML =
    visible
      .map(card)
      .join('');

}


/* =====================================================
   DRAWER
===================================================== */

function toggleDrawer(){

  $('drawer')
    ?.classList
    .toggle('open');

}


function renderDrawerArticles(){

  const drawer =
    $('drawerArticles');

  if(!drawer) return;

  if(!articles.length){

    drawer.innerHTML =
      '<p>Zatím nejsou žádné články.</p>';

    return;
  }

  drawer.innerHTML =
    articles
      .slice(0,7)
      .map(article => `

        <div
          class="drawer-item"
          onclick="
            openArticle(${Number(article.id)});
            toggleDrawer();
          "
        >

          ${
            article.cover_url
              ? `
                <img
                  src="${esc(article.cover_url)}"
                  alt=""
                >
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
              ${esc(article.category || 'ZDRAVÍ')}
            </small>

          </div>

        </div>

      `)
      .join('');

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
            Články se nepodařilo načíst.
          </strong>
        </div>
      `;

    }

    return;
  }

  articles =
    data || [];

  renderHomeArticles();

  renderDrawerArticles();

  renderAdminList();

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
   SEARCH
===================================================== */

function setupSearch(){

  const button = $('searchBtn');
  const input = $('searchInput');
  const close = $('searchClose');
  const overlay = $('searchOverlay');

  if(
    !button ||
    !input ||
    !close ||
    !overlay
  ) return;

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
    () => filterArticles(input.value)
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

  const overlay = $('searchOverlay');
  const input = $('searchInput');

  if(!overlay || !input) return;

  searchOpen = true;

  overlay.classList.remove('hidden');

  document.body.classList.add(
    'search-active'
  );

  setTimeout(
    () => input.focus(),
    50
  );

}


function closeSearch(){

  const overlay = $('searchOverlay');
  const input = $('searchInput');

  if(!overlay || !input) return;

  searchOpen = false;

  input.value = '';

  overlay.classList.add('hidden');

  document.body.classList.remove(
    'search-active'
  );

}


function filterArticles(value = ''){

  const query =
    value
      .trim()
      .toLowerCase();

  if(!query){

    if(currentView === 'home'){
      renderHomeArticles();
    }

    return;
  }

  const filtered =
    articles.filter(article => {

      const title =
        String(article.title || '')
          .toLowerCase();

      const category =
        String(article.category || '')
          .toLowerCase();

      const excerpt =
        String(article.excerpt || '')
          .toLowerCase();

      const content =
        String(article.content || '')
          .toLowerCase();

      return (
        title.includes(query) ||
        category.includes(query) ||
        excerpt.includes(query) ||
        content.includes(query)
      );

    });

  hideMainViews();

  $('articlePage')?.classList.remove('hidden');

  renderArticlePage(
    filtered,
    'VÝSLEDKY VYHLEDÁVÁNÍ',
    `Výsledky pro: „${value.trim()}“`
  );

}


/* =====================================================
   CALCULATORS
===================================================== */

function numberValue(id){

  const element =
    $(id);

  if(!element) return NaN;

  return Number(
    element.value
  );

}


/* ---------------- BMI ---------------- */

function calculateBMI(){

  const weight =
    numberValue('bmiWeight');

  const heightCm =
    numberValue('bmiHeight');

  const result =
    $('bmiResult');

  if(
    !weight ||
    !heightCm ||
    weight <= 0 ||
    heightCm <= 0
  ){

    result.innerHTML =
      'Zadejte prosím platnou váhu a výšku.';

    return;
  }

  const height =
    heightCm / 100;

  const bmi =
    weight /
    (height * height);

  let category = '';

  if(bmi < 18.5){
    category = 'podváha';
  }else if(bmi < 25){
    category = 'běžné rozmezí';
  }else if(bmi < 30){
    category = 'nadváha';
  }else{
    category = 'obezita';
  }

  result.innerHTML = `
    <strong>${bmi.toFixed(1)}</strong>
    Orientační hodnota: ${category}.
  `;

}


/* ---------------- MAINTENANCE ---------------- */

function calculateMaintenance(){

  const sex =
    $('maintenanceSex')?.value;

  const age =
    numberValue('maintenanceAge');

  const weight =
    numberValue('maintenanceWeight');

  const height =
    numberValue('maintenanceHeight');

  const activity =
    numberValue('maintenanceActivity');

  const result =
    $('maintenanceResult');


  if(
    !sex ||
    !age ||
    !weight ||
    !height ||
    !activity ||
    age < 18 ||
    weight <= 0 ||
    height <= 0
  ){

    result.innerHTML =
      'Vyplňte prosím všechny údaje.';

    return;
  }


  /*
    Mifflin-St Jeor rovnice.

    Muž:
    10 × váha + 6.25 × výška - 5 × věk + 5

    Žena:
    10 × váha + 6.25 × výška - 5 × věk - 161
  */

  let bmr;

  if(sex === 'male'){

    bmr =
      (10 * weight) +
      (6.25 * height) -
      (5 * age) +
      5;

  }else{

    bmr =
      (10 * weight) +
      (6.25 * height) -
      (5 * age) -
      161;

  }


  const maintenance =
    bmr * activity;


  const rounded =
    Math.round(maintenance);


  result.innerHTML = `
    <strong>${rounded} kcal / den</strong>
    Přibližný udržovací příjem.
  `;


  /*
    Automaticky předvyplníme výsledky
    do kalkulaček hubnutí a nabírání.
  */

  if($('cutMaintenance')){
    $('cutMaintenance').value =
      rounded;
  }

  if($('bulkMaintenance')){
    $('bulkMaintenance').value =
      rounded;
  }

}


/* ---------------- CUT ---------------- */

function calculateCut(){

  const maintenance =
    numberValue('cutMaintenance');

  const deficit =
    numberValue('cutDeficit');

  const result =
    $('cutResult');


  if(
    !maintenance ||
    maintenance <= 0 ||
    !deficit
  ){

    result.innerHTML =
      'Zadejte prosím udržovací příjem.';

    return;
  }


  const calories =
    Math.round(
      maintenance *
      (1 - deficit)
    );


  const difference =
    Math.round(
      maintenance - calories
    );


  result.innerHTML = `
    <strong>${calories} kcal / den</strong>
    To je přibližně ${difference} kcal pod udržovacím příjmem.
  `;

}


/* ---------------- BULK ---------------- */

function calculateBulk(){

  const maintenance =
    numberValue('bulkMaintenance');

  const surplus =
    numberValue('bulkSurplus');

  const result =
    $('bulkResult');


  if(
    !maintenance ||
    maintenance <= 0 ||
    !surplus
  ){

    result.innerHTML =
      'Zadejte prosím udržovací příjem.';

    return;
  }


  const calories =
    Math.round(
      maintenance *
      (1 + surplus)
    );


  const difference =
    Math.round(
      calories - maintenance
    );


  result.innerHTML = `
    <strong>${calories} kcal / den</strong>
    To je přibližně ${difference} kcal nad udržovacím příjmem.
  `;

}


/* =====================================================
   AUTH
===================================================== */

function openAuth(mode='login'){

  authMode = mode;

  const auth =
    $('auth');

  if(!auth) return;

  auth.classList.remove('hidden');

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
      .trim();

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
      .eq('id', userId)
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

      admin?.classList.add('hidden');

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

      admin?.classList.remove('hidden');

      await refreshAdminStats();

    }else{

      admin?.classList.add('hidden');

    }

  }catch(error){

    console.error(
      'Chyba uživatelského rozhraní:',
      error
    );

  }

}


/* =====================================================
   NEWSLETTER
===================================================== */

async function subscribe(event){

  event.preventDefault();

  if(!db) return;

  const input =
    event.target.querySelector(
      'input[type=email]'
    );

  const email =
    input.value
      .trim()
      .toLowerCase();

  if(!email) return;

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

    event.target.innerHTML =
      `
        <b>
          Odběr se nepodařilo dokončit.
        </b>
      `;

    return;
  }

  event.target.innerHTML =
    `
      <b>
        Jste přihlášeni. Vítejte ve VIRENO!
      </b>
    `;

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

  $('articleViewTitle').textContent =
    article.title || '';

  $('articleViewMeta').textContent =
    `${formatDate(article.created_at)} · ${article.category || 'ZDRAVÍ'}`;

  $('articleViewImage').src =
    article.cover_url ||
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80';

  $('articleViewContent').innerHTML =
    article.content || '';

  $('articleView').classList.remove(
    'hidden'
  );

}


function closeArticle(){

  $('articleView')
    ?.classList
    .add('hidden');

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
      .getPublicUrl(filename);

  return data.publicUrl;

}


function showCoverPreview(url){

  const preview =
    $('coverPreview');

  const image =
    $('coverPreviewImg');

  if(!preview || !image) return;

  if(!url){

    preview.classList.add('hidden');

    image.src = '';

    return;
  }

  image.src = url;

  preview.classList.remove('hidden');

}


/* =====================================================
   SAVE ARTICLE
===================================================== */

async function saveArticle(event){

  event.preventDefault();

  if(!(await isAdmin())){

    $('articleMsg').textContent =
      'Přístup mají pouze administrátoři.';

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

      $('articleMsg').textContent =
        'Nahrávám obrázek...';

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
        $('category').value

    };

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

    $('articleMsg').textContent =
      editingId
        ? 'Článek byl upraven.'
        : 'Článek byl publikován.';

    editingId = null;

    $('articleForm').reset();

    showCoverPreview(null);

    if(button){
      button.textContent =
        'PUBLIKOVAT ČLÁNEK';
    }

    await loadArticles();

    await refreshAdminStats();

  }catch(error){

    console.error(
      'Chyba při ukládání:',
      error
    );

    $('articleMsg').textContent =
      error.message ||
      'Něco se nepodařilo.';

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
    article.category || 'ZDRAVÍ';

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

    alert(
      'Přístup mají pouze administrátoři.'
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

    alert(error.message);

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
      '<p>Zatím nejsou žádné články.</p>';

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
              ${esc(article.category || 'ZDRAVÍ')}
            </small>

          </div>

          <div>

            <button
              type="button"
              onclick="editArticle(${Number(article.id)})"
            >
              UPRAVIT
            </button>

            <button
              type="button"
              class="danger"
              onclick="deleteArticle(${Number(article.id)})"
            >
              SMAZAT
            </button>

          </div>

        </div>

      `)
      .join('');

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
   EVENTS
===================================================== */

function setupEvents(){

  $('loginBtn')?.addEventListener(
    'click',
    () => openAuth('login')
  );

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


  document.addEventListener(
    'keydown',
    event => {

      if(event.key !== 'Escape'){
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
   INIT
===================================================== */

async function init(){

  console.log(
    'VIRENO se spouští...'
  );

  if(!initSupabase()){

    console.error(
      'Supabase se nepodařilo inicializovat.'
    );

    return;
  }

  setupEvents();

  await loadArticles();

  await trackVisit();

  await updateUserUI();

  showHome();

  console.log(
    'VIRENO je připraveno.'
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
