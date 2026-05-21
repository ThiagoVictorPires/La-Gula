// ── FIREBASE ──────────────────────────────────────────────────
import { initializeApp }       from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore, collection, query, orderBy, getDocs,
  doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const CLOUDINARY_CLOUD  = 'dmjcjuvuo';
const CLOUDINARY_PRESET = 'ml_default';

const firebaseConfig = {
  apiKey:            'AIzaSyBJ69v9FPhKMfXTsPS_HUmxJDQ7WPTjw4o',
  authDomain:        'site-la-gula.firebaseapp.com',
  projectId:         'site-la-gula',
  storageBucket:     'site-la-gula.firebasestorage.app',
  messagingSenderId: '216119052887',
  appId:             '1:216119052887:web:48399f1d4a8626b9083112',
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

let todosItens = [];

// ── AUTH ──────────────────────────────────────────────────────
const loginScreen = document.getElementById('login-screen');
const adminScreen = document.getElementById('admin-screen');
const loginError  = document.getElementById('login-error');
const btnLogin    = document.getElementById('btn-login');

function renderHorarioList() {
  const list = document.getElementById('horario-list');
  list.innerHTML = DIAS.map(({ key, label }) => `
    <div class="h-row">
      <div class="h-main">
        <span class="h-day">${label}</span>
        <label class="toggle">
          <input type="checkbox" id="h-aberto-${key}" onchange="window.toggleDia('${key}',this.checked)"/>
          <span class="slider"></span>
        </label>
        <span class="h-status h-status-closed" id="h-status-${key}">Fechado</span>
        <button class="h-replicar" onclick="window.replicarHorario('${key}')" title="Replicar para todos os dias">
          <svg fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" width="13" height="13"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
          Replicar para todos
        </button>
      </div>
      <div class="h-periodos" id="h-periodos-${key}" style="display:none">
        <div class="h-periodo">
          <label class="toggle">
            <input type="checkbox" id="h-almoco-on-${key}" onchange="window.togglePeriodo('${key}','almoco',this.checked)"/>
            <span class="slider"></span>
          </label>
          <span class="h-periodo-lbl">Almoço</span>
          <input type="time" class="h-time-input" id="h-almoco-ab-${key}" disabled/>
          <span class="h-sep">até</span>
          <input type="time" class="h-time-input" id="h-almoco-fe-${key}" disabled/>
        </div>
        <div class="h-periodo">
          <label class="toggle">
            <input type="checkbox" id="h-jantar-on-${key}" onchange="window.togglePeriodo('${key}','jantar',this.checked)"/>
            <span class="slider"></span>
          </label>
          <span class="h-periodo-lbl">Jantar</span>
          <input type="time" class="h-time-input" id="h-jantar-ab-${key}" disabled/>
          <span class="h-sep">até</span>
          <input type="time" class="h-time-input" id="h-jantar-fe-${key}" disabled/>
        </div>
      </div>
    </div>`).join('');
}

function replicarHorario(keyOrigem) {
  const aberto      = document.getElementById(`h-aberto-${keyOrigem}`).checked;
  const almocoOn    = document.getElementById(`h-almoco-on-${keyOrigem}`).checked;
  const almocoAb    = document.getElementById(`h-almoco-ab-${keyOrigem}`).value;
  const almocoFe    = document.getElementById(`h-almoco-fe-${keyOrigem}`).value;
  const jantarOn    = document.getElementById(`h-jantar-on-${keyOrigem}`).checked;
  const jantarAb    = document.getElementById(`h-jantar-ab-${keyOrigem}`).value;
  const jantarFe    = document.getElementById(`h-jantar-fe-${keyOrigem}`).value;

  DIAS.filter(d => d.key !== keyOrigem).forEach(({ key }) => {
    document.getElementById(`h-aberto-${key}`).checked = aberto;
    toggleDia(key, aberto);
    if (aberto) {
      document.getElementById(`h-almoco-on-${key}`).checked = almocoOn;
      document.getElementById(`h-almoco-ab-${key}`).value   = almocoAb;
      document.getElementById(`h-almoco-fe-${key}`).value   = almocoFe;
      togglePeriodo(key, 'almoco', almocoOn);

      document.getElementById(`h-jantar-on-${key}`).checked = jantarOn;
      document.getElementById(`h-jantar-ab-${key}`).value   = jantarAb;
      document.getElementById(`h-jantar-fe-${key}`).value   = jantarFe;
      togglePeriodo(key, 'jantar', jantarOn);
    }
  });

  toast('Horário replicado para todos os dias!', 'success');
}

onAuthStateChanged(auth, user => {
  if (user) {
    loginScreen.style.display = 'none';
    adminScreen.style.display = 'block';
    carregarItens();
    carregarGaleria();
    renderHorarioList();
    carregarHorarios();
  } else {
    loginScreen.style.display = 'flex';
    adminScreen.style.display = 'none';
  }
});

async function fazerLogin() {
  const email = document.getElementById('email-input').value.trim();
  const senha = document.getElementById('senha-input').value;
  if (!email || !senha) { loginError.textContent = 'Preencha e-mail e senha.'; return; }
  btnLogin.disabled = true; btnLogin.textContent = 'Entrando…'; loginError.textContent = '';
  try {
    await signInWithEmailAndPassword(auth, email, senha);
  } catch (e) {
    loginError.textContent = traduzirErroAuth(e.code);
    btnLogin.disabled = false; btnLogin.textContent = 'Entrar';
  }
}

function traduzirErroAuth(code) {
  const erros = {
    'auth/invalid-email':          'E-mail inválido.',
    'auth/user-not-found':         'Usuário não encontrado.',
    'auth/wrong-password':         'Senha incorreta.',
    'auth/invalid-credential':     'E-mail ou senha incorretos.',
    'auth/too-many-requests':      'Muitas tentativas. Aguarde.',
    'auth/network-request-failed': 'Sem conexão.',
  };
  return erros[code] || 'Erro ao entrar. Tente novamente.';
}

async function fazerLogout() { await signOut(auth); }

btnLogin.addEventListener('click', fazerLogin);
['email-input', 'senha-input'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') fazerLogin();
  });
});

// ── CARREGAR ITENS ────────────────────────────────────────────
async function carregarItens() {
  try {
    const q = query(collection(db, 'cardapio'), orderBy('categoria'), orderBy('nome'));
    const snapshot = await getDocs(q);
    todosItens = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    atualizarStats(); popularFiltros(); renderTabela();
  } catch (e) {
    console.error(e); toast('Erro ao carregar dados', 'error');
  }
}

// ── SALVAR ITEM ───────────────────────────────────────────────
async function salvarItem() {
  const btn = document.getElementById('btn-save');
  btn.disabled = true; btn.textContent = 'Salvando…';

  const id       = document.getElementById('edit-id').value;
  const precoRaw = document.getElementById('edit-preco').value.replace(',', '.').replace('R$', '').trim();

  const payload = {
    nome:          document.getElementById('edit-nome').value.trim(),
    categoria:     document.getElementById('edit-categoria').value.trim(),
    subcategoria:  document.getElementById('edit-subcategoria').value.trim(),
    descricao:     document.getElementById('edit-descricao').value.trim(),
    preco:         precoRaw ? parseFloat(precoRaw) : null,
    nota:          document.getElementById('edit-nota').value.trim(),
    foto_url:      document.getElementById('edit-foto').value.trim(),
    ativo:         document.getElementById('edit-ativo').checked,
    atualizado_em: serverTimestamp(),
  };

  if (!payload.nome || !payload.categoria) {
    toast('Preencha nome e categoria', 'error');
    btn.disabled = false; btn.textContent = 'Salvar'; return;
  }

  try {
    if (id) {
      await updateDoc(doc(db, 'cardapio', id), payload);
    } else {
      payload.criado_em = serverTimestamp();
      await addDoc(collection(db, 'cardapio'), payload);
    }
    toast(id ? 'Item atualizado!' : 'Item criado!', 'success');
    fecharModal();
    await carregarItens();
  } catch (e) {
    console.error(e);
    if (e.code === 'permission-denied') {
      toast('Sessão expirada. Faça login novamente.', 'error');
      await fazerLogout();
    } else {
      toast('Erro ao salvar. Tente novamente.', 'error');
    }
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar';
  }
}

// ── CLOUDINARY UPLOAD — PRODUTO ──────────────────────────────
function mostrarPreviewFoto(url) {
  document.getElementById('upload-placeholder').style.display = 'none';
  document.getElementById('upload-progress').style.display    = 'none';
  document.getElementById('upload-preview').style.display     = 'block';
  document.getElementById('upload-preview-img').src           = url;
}

function removerFoto() {
  document.getElementById('edit-foto').value                    = '';
  document.getElementById('upload-input').value                 = '';
  document.getElementById('upload-preview').style.display       = 'none';
  document.getElementById('upload-progress').style.display      = 'none';
  document.getElementById('upload-placeholder').style.display   = 'flex';
}

function uploadFoto(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('Imagem muito grande (máx. 5 MB)', 'error'); input.value = ''; return; }

  document.getElementById('upload-placeholder').style.display = 'none';
  document.getElementById('upload-preview').style.display     = 'none';
  document.getElementById('upload-progress').style.display    = 'flex';
  document.getElementById('upload-progress-fill').style.width = '0%';

  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_PRESET);
  fd.append('folder', 'cardapio');

  const xhr = new XMLHttpRequest();
  xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`);
  xhr.upload.onprogress = e => {
    if (e.lengthComputable) {
      const pct = Math.round(e.loaded / e.total * 100);
      document.getElementById('upload-progress-fill').style.width = pct + '%';
      document.getElementById('upload-progress-txt').textContent  = `Enviando… ${pct}%`;
    }
  };
  xhr.onload = () => {
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText);
      document.getElementById('edit-foto').value = data.secure_url;
      mostrarPreviewFoto(data.secure_url);
      toast('Foto enviada!', 'success');
    } else { toast('Erro no upload. Tente novamente.', 'error'); removerFoto(); }
  };
  xhr.onerror = () => { toast('Erro no upload.', 'error'); removerFoto(); };
  xhr.send(fd);
}

// ── CLOUDINARY UPLOAD — GALERIA ───────────────────────────────
async function uploadGaleria(input) {
  const files = [...input.files];
  if (!files.length) return;

  const grandes = files.filter(f => f.size > 10 * 1024 * 1024);
  if (grandes.length) { toast(`${grandes.length} foto(s) acima de 10 MB ignoradas`, 'error'); }

  const validas = files.filter(f => f.size <= 10 * 1024 * 1024);
  if (!validas.length) { input.value = ''; return; }

  toast(`Enviando ${validas.length} foto(s)…`, 'success');

  const uploads = validas.map(file => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY_PRESET);
    fd.append('folder', 'galeria');
    return fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: fd })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => addDoc(collection(db, 'galeria'), { url: data.secure_url, criado_em: serverTimestamp() }));
  });

  const resultados = await Promise.allSettled(uploads);
  const ok   = resultados.filter(r => r.status === 'fulfilled').length;
  const erro = resultados.filter(r => r.status === 'rejected').length;

  if (ok)   toast(`${ok} foto(s) adicionada(s)!`, 'success');
  if (erro) toast(`${erro} foto(s) falharam`, 'error');

  input.value = '';
  carregarGaleria();
}

async function carregarGaleria() {
  try {
    const q    = query(collection(db, 'galeria'), orderBy('criado_em', 'desc'));
    const snap = await getDocs(q);
    const grid = document.getElementById('galeria-admin-grid');
    if (snap.empty) { grid.innerHTML = '<div class="galeria-admin-empty">Nenhuma foto ainda.</div>'; return; }
    grid.innerHTML = snap.docs.map(d => `
      <div class="galeria-admin-item">
        <img src="${d.data().url}" alt="foto" loading="lazy"/>
        <button class="galeria-del" onclick="window._excluirGaleria('${d.id}')" title="Remover">✕</button>
      </div>`).join('');
  } catch (e) { console.error(e); }
}

async function excluirGaleria(id) {
  if (!confirm('Remover esta foto da galeria?')) return;
  try { await deleteDoc(doc(db, 'galeria', id)); carregarGaleria(); toast('Foto removida!', 'success'); }
  catch { toast('Erro ao remover.', 'error'); }
}

// ── TOGGLE ATIVO ──────────────────────────────────────────────
async function toggleAtivo(id, novoStatus) {
  try {
    await updateDoc(doc(db, 'cardapio', id), { ativo: novoStatus, atualizado_em: serverTimestamp() });
    const item = todosItens.find(i => i.id === id);
    if (item) item.ativo = novoStatus;
    atualizarStats(); renderTabela();
    toast(novoStatus ? 'Item ativado!' : 'Item ocultado!', 'success');
  } catch { toast('Erro ao atualizar', 'error'); await carregarItens(); }
}

// ── TABELA ────────────────────────────────────────────────────
function renderTabela() {
  const busca  = document.getElementById('busca').value.toLowerCase();
  const cat    = document.getElementById('filtro-cat').value;
  const status = document.getElementById('filtro-status').value;
  const filtrados = todosItens.filter(i => {
    const matchBusca  = !busca  || i.nome?.toLowerCase().includes(busca) || i.categoria?.toLowerCase().includes(busca);
    const matchCat    = !cat    || i.categoria === cat;
    const matchStatus = !status || (status === 'ativo' ? i.ativo : !i.ativo);
    return matchBusca && matchCat && matchStatus;
  });
  const tbody = document.getElementById('tabela-body');
  if (!filtrados.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Nenhum item encontrado.</td></tr>`; return;
  }
  tbody.innerHTML = filtrados.map(item => `
    <tr>
      <td class="td-name">
        ${item.foto_url ? `<img src="${item.foto_url}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;margin-right:8px;vertical-align:middle"/>` : ''}
        ${item.nome}
      </td>
      <td class="td-cat">${item.categoria}${item.subcategoria ? ' · ' + item.subcategoria : ''}</td>
      <td class="td-desc">${item.descricao || '—'}</td>
      <td class="td-price">R$ ${item.preco != null ? Number(item.preco).toFixed(2).replace('.', ',') : '—'}</td>
      <td>
        <div class="toggle-wrap">
          <label class="toggle">
            <input type="checkbox" ${item.ativo ? 'checked' : ''} onchange="window._toggleAtivo('${item.id}', this.checked)"/>
            <span class="slider"></span>
          </label>
          <span class="toggle-lbl">${item.ativo ? 'Visível' : 'Oculto'}</span>
        </div>
      </td>
      <td>
        <div class="td-actions">
          <button class="btn-edit"   onclick="window._abrirModal('${item.id}')">Editar</button>
          <button class="btn-del"    onclick="window._confirmarOcultar('${item.id}', '${item.nome.replace(/'/g, "\\'")}')">Ocultar</button>
          <button class="btn-delete" onclick="window._confirmarExcluir('${item.id}', '${item.nome.replace(/'/g, "\\'")}')">Excluir</button>
        </div>
      </td>
    </tr>`).join('');
}

// ── MODAL ─────────────────────────────────────────────────────
function abrirModal(id) {
  document.getElementById('modal-overlay').classList.add('open');
  if (id) {
    const item = todosItens.find(i => i.id === id);
    document.getElementById('modal-titulo').textContent  = 'Editar item';
    document.getElementById('edit-id').value             = item.id;
    document.getElementById('edit-nome').value           = item.nome || '';
    document.getElementById('edit-categoria').value      = item.categoria || '';
    document.getElementById('edit-subcategoria').value   = item.subcategoria || '';
    document.getElementById('edit-descricao').value      = item.descricao || '';
    document.getElementById('edit-preco').value          = item.preco != null ? String(item.preco).replace('.', ',') : '';
    document.getElementById('edit-nota').value           = item.nota || '';
    document.getElementById('edit-foto').value           = item.foto_url || '';
    document.getElementById('edit-ativo').checked        = item.ativo;
    if (item.foto_url) mostrarPreviewFoto(item.foto_url); else removerFoto();
  } else {
    document.getElementById('modal-titulo').textContent = 'Novo item';
    document.getElementById('edit-id').value = '';
    ['edit-nome','edit-categoria','edit-subcategoria','edit-descricao','edit-preco','edit-nota','edit-foto']
      .forEach(f => document.getElementById(f).value = '');
    document.getElementById('edit-ativo').checked = true;
    removerFoto();
  }
}

function fecharModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) fecharModal();
});

// ── CONFIRM OCULTAR ───────────────────────────────────────────
let _confirmarId = null;
function confirmarOcultar(id, nome) {
  _confirmarId = id;
  document.getElementById('confirm-msg').innerHTML =
    `<strong>${nome}</strong> será ocultado do site.<br>Nenhum dado é apagado — você pode reativar quando quiser.`;
  document.getElementById('confirm-overlay').classList.add('open');
  document.getElementById('btn-confirm-ok').onclick = async () => {
    await toggleAtivo(_confirmarId, false); fecharConfirm();
  };
}
function fecharConfirm() {
  document.getElementById('confirm-overlay').classList.remove('open'); _confirmarId = null;
}

// ── EXCLUIR PERMANENTE ────────────────────────────────────────
let _excluirId = null;
function confirmarExcluir(id, nome) {
  _excluirId = id;
  document.getElementById('excluir-msg').innerHTML =
    `<strong>${nome}</strong> será removido permanentemente.<br>Esta ação não pode ser desfeita.`;
  document.getElementById('excluir-overlay').classList.add('open');
  document.getElementById('btn-excluir-ok').onclick = async () => {
    await excluirItem(_excluirId); fecharConfirmExcluir();
  };
}
function fecharConfirmExcluir() {
  document.getElementById('excluir-overlay').classList.remove('open'); _excluirId = null;
}
async function excluirItem(id) {
  try {
    await deleteDoc(doc(db, 'cardapio', id));
    todosItens = todosItens.filter(i => i.id !== id);
    atualizarStats(); popularFiltros(); renderTabela();
    toast('Item excluído!', 'success');
  } catch (e) {
    console.error(e);
    if (e.code === 'permission-denied') {
      toast('Sessão expirada. Faça login novamente.', 'error');
      await fazerLogout();
    } else {
      toast('Erro ao excluir. Tente novamente.', 'error');
    }
  }
}

// ── STATS & FILTROS ───────────────────────────────────────────
function atualizarStats() {
  const ativos = todosItens.filter(i => i.ativo).length;
  const cats   = new Set(todosItens.map(i => i.categoria)).size;
  document.getElementById('stat-total').textContent   = todosItens.length;
  document.getElementById('stat-ativos').textContent  = ativos;
  document.getElementById('stat-cats').textContent    = cats;
  document.getElementById('stat-ocultos').textContent = todosItens.length - ativos;
}

function popularFiltros() {
  const sel   = document.getElementById('filtro-cat');
  const cats  = [...new Set(todosItens.map(i => i.categoria))].sort();
  const atual = sel.value;
  sel.innerHTML = '<option value="">Todas as categorias</option>' +
    cats.map(c => `<option value="${c}" ${c === atual ? 'selected' : ''}>${c}</option>`).join('');
}

// ── TOAST ─────────────────────────────────────────────────────
function toast(msg, tipo = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = `toast ${tipo} show`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── HORÁRIO DE FUNCIONAMENTO ──────────────────────────────────
const DIAS = [
  { key: 'seg', label: 'Segunda-feira' },
  { key: 'ter', label: 'Terça-feira'   },
  { key: 'qua', label: 'Quarta-feira'  },
  { key: 'qui', label: 'Quinta-feira'  },
  { key: 'sex', label: 'Sexta-feira'   },
  { key: 'sab', label: 'Sábado'        },
  { key: 'dom', label: 'Domingo'       },
];

async function carregarHorarios() {
  try {
    const snap = await getDoc(doc(db, 'configuracoes', 'horarios'));
    const data = snap.exists() ? snap.data() : {};
    DIAS.forEach(({ key }) => {
      const d = data[key] || {};
      const aberto = d.aberto || false;
      document.getElementById(`h-aberto-${key}`).checked = aberto;
      toggleDia(key, aberto);
      if (aberto) {
        ['almoco', 'jantar'].forEach(p => {
          const periodo = d[p] || { ativo: false, abertura: '', fechamento: '' };
          document.getElementById(`h-${p}-on-${key}`).checked       = periodo.ativo;
          document.getElementById(`h-${p}-ab-${key}`).value         = periodo.abertura   || '';
          document.getElementById(`h-${p}-fe-${key}`).value         = periodo.fechamento || '';
          togglePeriodo(key, p, periodo.ativo);
        });
      }
    });
  } catch (e) {
    console.error(e);
    toast('Erro ao carregar horários', 'error');
  }
}

function toggleDia(key, aberto) {
  const lbl = document.getElementById(`h-status-${key}`);
  lbl.textContent = aberto ? 'Aberto' : 'Fechado';
  lbl.className   = `h-status ${aberto ? 'h-status-open' : 'h-status-closed'}`;
  const periodos = document.getElementById(`h-periodos-${key}`);
  periodos.style.display = aberto ? 'flex' : 'none';
  if (!aberto) {
    ['almoco', 'jantar'].forEach(p => {
      document.getElementById(`h-${p}-on-${key}`).checked = false;
      togglePeriodo(key, p, false);
    });
  }
}

function togglePeriodo(key, periodo, ativo) {
  ['ab', 'fe'].forEach(t => {
    const el = document.getElementById(`h-${periodo}-${t}-${key}`);
    el.disabled      = !ativo;
    el.style.opacity = ativo ? '1' : '0.3';
  });
}

async function salvarHorarios() {
  const btn = document.getElementById('btn-save-horario');
  btn.disabled = true; btn.textContent = 'Salvando…';
  const payload = {};
  DIAS.forEach(({ key }) => {
    const aberto = document.getElementById(`h-aberto-${key}`).checked;
    if (!aberto) { payload[key] = { aberto: false }; return; }
    payload[key] = { aberto: true };
    ['almoco', 'jantar'].forEach(p => {
      const ativo = document.getElementById(`h-${p}-on-${key}`).checked;
      payload[key][p] = {
        ativo,
        abertura:   ativo ? document.getElementById(`h-${p}-ab-${key}`).value : '',
        fechamento: ativo ? document.getElementById(`h-${p}-fe-${key}`).value : '',
      };
    });
  });
  try {
    await setDoc(doc(db, 'configuracoes', 'horarios'), payload);
    toast('Horários salvos!', 'success');
  } catch (e) {
    console.error(e);
    toast('Erro ao salvar horários', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar horários';
  }
}

// ── EXPÕE FUNÇÕES AO HTML ─────────────────────────────────────
// ── NAVEGAÇÃO DE ABAS ────────────────────────────────────────
document.querySelectorAll('.admin-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

window._baixarQR = function() {
  const url = 'https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=https%3A%2F%2Fla-gula.vercel.app%2Fmesa.html&bgcolor=f7f2ea&color=1c1410&margin=40&format=png';
  const a   = document.createElement('a');
  a.href     = url;
  a.download = 'qrcode-lagula.png';
  a.target   = '_blank';
  a.click();
};
window.salvarHorarios  = salvarHorarios;
window.toggleDia       = toggleDia;
window.togglePeriodo   = togglePeriodo;
window.replicarHorario = replicarHorario;
window.removerFoto     = removerFoto;
window._uploadFoto     = uploadFoto;
window._uploadGaleria  = uploadGaleria;
window._excluirGaleria = excluirGaleria;
window.fazerLogout           = fazerLogout;
window.salvarItem         = salvarItem;
window.renderTabela       = renderTabela;
window.fecharModal        = fecharModal;
window.fecharConfirm      = fecharConfirm;
window.fecharConfirmExcluir = fecharConfirmExcluir;
window._toggleAtivo       = toggleAtivo;
window._abrirModal        = abrirModal;
window._confirmarOcultar  = confirmarOcultar;
window._confirmarExcluir  = confirmarExcluir;