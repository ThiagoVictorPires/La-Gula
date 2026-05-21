// ── FIREBASE ──────────────────────────────────────────────────
import { initializeApp }  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, query, where, orderBy, getDocs }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            'AIzaSyBJ69v9FPhKMfXTsPS_HUmxJDQ7WPTjw4o',
  authDomain:        'site-la-gula.firebaseapp.com',
  projectId:         'site-la-gula',
  storageBucket:     'site-la-gula.firebasestorage.app',
  messagingSenderId: '216119052887',
  appId:             '1:216119052887:web:48399f1d4a8626b9083112',
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
let allItems = [];

// ── SANITIZAÇÃO XSS ───────────────────────────────────────────
// Escapa HTML perigoso antes de inserir texto do banco no innerHTML
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── CARREGAR CARDÁPIO ─────────────────────────────────────────
async function loadMenu() {
  const loading = document.getElementById('loading-msg');
  const main    = document.getElementById('cardapio-main');
  if (!main) return;

  try {
    const q = query(
      collection(db, 'cardapio'),
      where('ativo', '==', true),
      orderBy('categoria'),
      orderBy('nome')
    );
    const snapshot = await getDocs(q);

    allItems = snapshot.docs.map(doc => ({
      id:           doc.id,
      categoria:    (doc.data().categoria    || '').trim(),
      subcategoria: (doc.data().subcategoria || '').trim(),
      nome:         (doc.data().nome         || '').trim(),
      descricao:    (doc.data().descricao    || '').trim(),
      preco:        doc.data().preco ?? null,
      nota:         (doc.data().nota         || '').trim(),
      foto:         (doc.data().foto_url     || '').trim(),
    }));

    buildCatTabs();
    renderAll('all');
    if (loading) loading.style.display = 'none';

  } catch (e) {
    console.error('Erro ao carregar cardápio:', e);
    if (loading) loading.innerHTML = `
      <div class="menu-error">
        <strong>Cardápio indisponível</strong>
        Tente recarregar ou peça pelo WhatsApp.
      </div>`;
  }
}

// ── TABS ──────────────────────────────────────────────────────
function buildCatTabs() {
  const container = document.getElementById('cat-tabs');
  if (!container) return;
  const cats = [...new Set(allItems.map(i => i.categoria))];
  container.innerHTML = `<button class="cat-tab on" data-cat="all">Todos</button>`;
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className   = 'cat-tab';
    btn.textContent = cat; // textContent é seguro — sem XSS
    btn.dataset.cat = slug(cat);
    container.appendChild(btn);
  });
  container.addEventListener('click', e => {
    const btn = e.target.closest('.cat-tab');
    if (!btn) return;
    container.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    renderAll(btn.dataset.cat);
    document.getElementById('cardapio-main')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// ── BUSCA ─────────────────────────────────────────────────────
let termoBusca = '';

function filtrarBusca(valor) {
  termoBusca = valor.trim().toLowerCase();
  document.getElementById('busca-clear').style.display = termoBusca ? 'flex' : 'none';
  // reseta tab para "Todos" ao buscar
  if (termoBusca) {
    document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('on'));
    document.querySelector('.cat-tab[data-cat="all"]')?.classList.add('on');
  }
  renderAll('all');
}

function limparBusca() {
  termoBusca = '';
  document.getElementById('busca-cardapio').value = '';
  document.getElementById('busca-clear').style.display = 'none';
  renderAll('all');
}

// ── RENDER ────────────────────────────────────────────────────
function renderAll(filterCat) {
  const main = document.getElementById('cardapio-main');
  if (!main) return;
  const cats = [...new Set(allItems.map(i => i.categoria))];
  let html = '';
  cats.forEach(cat => {
    if (filterCat !== 'all' && filterCat !== slug(cat)) return;
    let items = allItems.filter(i => i.categoria === cat);
    if (termoBusca) {
      items = items.filter(i =>
        i.nome.toLowerCase().includes(termoBusca) ||
        i.descricao.toLowerCase().includes(termoBusca) ||
        i.categoria.toLowerCase().includes(termoBusca)
      );
    }
    if (!items.length) return;
    html += `
      <section class="cat-section" id="cat-${slug(cat)}">
        <div class="cat-section-header">
          <h2 class="cat-section-title">${esc(cat)}</h2>
          <span class="cat-section-count">${items.length} ${items.length === 1 ? 'item' : 'itens'}</span>
        </div>
        <div class="restaurant-grid">
          ${items.map(it => cardHTML(it, allItems.indexOf(it))).join('')}
        </div>
      </section>`;
  });
  main.innerHTML = html || `
    <div class="menu-error">
      <strong>Nenhum item encontrado</strong>
      ${termoBusca ? `Nenhum resultado para "<em>${esc(termoBusca)}</em>".` : 'Tente outra categoria.'}
    </div>`;
  main.querySelectorAll('.restaurant-card').forEach((card, i) => {
    card.style.animationDelay = `${i * 30}ms`;
    if (window.abrirItemModal) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', e => {
        if (e.target.closest('a')) return;
        const it = allItems[parseInt(card.dataset.idx)];
        if (it) abrirItemModal(it.nome, formatPreco(it.preco) || '', it.descricao || '', it.nota || '', it.foto && /^https?:\/\//i.test(it.foto) ? it.foto : '');
      });
    }
  });
}

// ── CARD — todos os textos passam por esc() ───────────────────
function cardHTML(it, idx = 0) {
  const preco  = formatPreco(it.preco);
  const tag    = esc(it.subcategoria || it.categoria);
  const nome   = esc(it.nome);
  const desc   = esc(it.descricao);
  const waText = encodeURIComponent(`Olá! Quero pedir: ${it.nome}`);
  const waLink = `https://wa.me/5519989962889?text=${waText}`;
  // Valida URL da foto — bloqueia javascript: e data: URLs
  const foto   = it.foto && /^https?:\/\//i.test(it.foto) ? it.foto : '';

  const btnPedir = `
    <a href="${waLink}" target="_blank" rel="noopener" class="rc-pedido">
      <svg fill="#fff" height="13" viewBox="0 0 24 24" width="13"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.132.558 4.13 1.532 5.866L.057 23.428a.75.75 0 00.921.921l5.57-1.476A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.9 0-3.7-.502-5.264-1.38l-.376-.217-3.302.875.876-3.296-.222-.384A10 10 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
      Pedir
    </a>`;

  if (foto) {
    return `
      <div class="restaurant-card" data-idx="${idx}">
        <div class="rc-photo">
          <img src="${foto}" alt="${nome}" loading="lazy"
            onerror="this.closest('.rc-photo').style.display='none'"/>
        </div>
        <div class="rc-body">
          <div class="rc-top">
            <div class="rc-name">${nome}</div>
            ${preco ? `<div class="rc-price">${esc(preco)}</div>` : ''}
          </div>
          ${desc ? `<div class="rc-desc">${desc}</div>` : ''}
          <div class="rc-footer"><span class="rc-tag">${tag}</span>${btnPedir}</div>
        </div>
      </div>`;
  }

  return `
    <div class="restaurant-card no-photo" data-idx="${idx}">
      <div class="rc-body">
        <div class="rc-top">
          <div class="rc-name">${nome}</div>
          ${preco ? `<div class="rc-price">${esc(preco)}</div>` : ''}
        </div>
        ${desc ? `<div class="rc-desc">${desc}</div>` : ''}
        <div class="rc-footer"><span class="rc-tag">${tag}</span>${btnPedir}</div>
      </div>
    </div>`;
}

function formatPreco(preco) {
  if (preco == null || preco === '') return '';
  const n = parseFloat(String(preco).replace(',', '.'));
  return isNaN(n) ? String(preco) : 'R$ ' + n.toFixed(2).replace('.', ',');
}

function slug(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

loadMenu();
