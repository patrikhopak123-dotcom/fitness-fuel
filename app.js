/* =====================================================
   VIRENO PAGE NAVIGATION
===================================================== */

let currentPage = 'home';
let currentCategory = null;


/* -----------------------------------------------------
   ZOBRAZENÍ STRÁNEK
----------------------------------------------------- */

function hideAllPages(){

  $('homePage')?.classList.add('hidden');

  $('articlesPage')?.classList.add('hidden');

  $('categoryPage')?.classList.add('hidden');

  $('calculatorsPage')?.classList.add('hidden');

}


function updateMainNav(page){

  document
    .querySelectorAll('.main-nav-link')
    .forEach(link => {

      link.classList.remove('active');

    });


  const active =
    document.querySelector(
      `.main-nav-link[data-page="${page}"]`
    );


  active?.classList.add('active');

}


function clearCategoryNavigation(){

  document
    .querySelectorAll('[data-category-nav]')
    .forEach(button => {

      button.classList.remove('active');

    });

}


/* -----------------------------------------------------
   DOMŮ
----------------------------------------------------- */

function showHome(){

  currentPage = 'home';

  currentCategory = null;

  hideAllPages();

  $('homePage')?.classList.remove('hidden');

  updateMainNav('home');

  clearCategoryNavigation();

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

  renderArticles();

}


/* -----------------------------------------------------
   VŠECHNY ČLÁNKY
----------------------------------------------------- */

function showAllArticles(){

  currentPage = 'articles';

  currentCategory = null;

  hideAllPages();

  $('articlesPage')?.classList.remove('hidden');

  updateMainNav('home');

  clearCategoryNavigation();

  renderAllArticlesPage();

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

}


/* -----------------------------------------------------
   KATEGORIE
----------------------------------------------------- */

function showCategory(category){

  currentPage = 'category';

  currentCategory = category;

  hideAllPages();

  $('categoryPage')?.classList.remove('hidden');

  updateMainNav('home');

  clearCategoryNavigation();


  const categoryButton =
    document.querySelector(
      `[data-category-nav="${CSS.escape(category)}"]`
    );


  categoryButton?.classList.add('active');


  const descriptions = {

    'POHYB':
      'Cvičení, síla, kondice a pohyb v každém věku.',

    'VÝŽIVA':
      'Praktické informace o jídle, stravování a živinách.',

    'HUBNUTÍ':
      'Rozumné hubnutí, kalorický deficit a práce s tělesnou hmotností.',

    'REGENERACE':
      'Spánek, odpočinek a to, jak dát tělu prostor pro zotavení.',

    'ZDRAVÍ':
      'Prevence, zdraví a praktické informace pro lepší každodenní život.'

  };


  if($('categoryPageTitle')){

    $('categoryPageTitle').textContent =
      category;

  }


  if($('categoryPageDescription')){

    $('categoryPageDescription').textContent =
      descriptions[category] ||
      'Články a praktické informace.';

  }


  renderCategoryArticles(category);


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

}


/* -----------------------------------------------------
   KALKULAČKY
----------------------------------------------------- */

function showCalculators(){

  currentPage = 'calculators';

  currentCategory = null;

  hideAllPages();

  $('calculatorsPage')?.classList.remove('hidden');

  updateMainNav('calculators');

  clearCategoryNavigation();

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

}


/* -----------------------------------------------------
   VYKRESLENÍ VŠECH ČLÁNKŮ
----------------------------------------------------- */

function renderAllArticlesPage(){

  const box =
    $('allArticlesCards');

  if(!box) return;


  if(!articles.length){

    box.innerHTML = `
      <div class="no-results">
        <strong>Zatím nejsou žádné články.</strong>
        <span>Nové články se zde objeví automaticky.</span>
      </div>
    `;

    return;

  }


  box.innerHTML =
    articles
      .map(card)
      .join('');

}


/* -----------------------------------------------------
   VYKRESLENÍ KATEGORIE
----------------------------------------------------- */

function renderCategoryArticles(category){

  const box =
    $('categoryArticlesCards');

  if(!box) return;


  const filtered =
    articles.filter(article => {

      return String(
        article.category || ''
      ).trim().toUpperCase() ===
      String(category)
        .trim()
        .toUpperCase();

    });


  if(!filtered.length){

    box.innerHTML = `
      <div class="no-results">

        <strong>
          V této kategorii zatím nejsou články.
        </strong>

        <span>
          Jakmile přidáš nový článek,
          objeví se zde automaticky.
        </span>

      </div>
    `;

    return;

  }


  box.innerHTML =
    filtered
      .map(card)
      .join('');

}
