/* ============================================================
   APP.JS — Aniversário do Noivo 🎉
   Integração com Supabase + lógica da interface
   ============================================================ */

// ───────────────────────────────────────────────────────────────
// 1. CONFIGURAÇÃO DO SUPABASE
//    Substitua com as suas credenciais do painel do Supabase.
//    (Settings > API)
// ───────────────────────────────────────────────────────────────
const SUPABASE_URL     = 'https://rxxoyujwvnyanvbvpnhd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4eG95dWp3dm55YW52YnZwbmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2Nzc4NTEsImV4cCI6MjEwMTI1Mzg1MX0.2bA3BTbGG_6dmJJ7CrJeyIYTGC67SrCuFkaNFT6PM9Q';

// Instância do cliente Supabase (exposto pelo bundle UMD como window.supabase)
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ───────────────────────────────────────────────────────────────
// 2. MAPEAMENTO DE EMOJIS POR CATEGORIA / NOME DO PRESENTE
//    Ajuste à vontade para os itens da sua lista!
// ───────────────────────────────────────────────────────────────
const EMOJI_MAP = [
  { keywords: ['panela', 'frigideira', 'wok', 'caçarola'], emoji: '🎁' },
  { keywords: ['faca', 'faqueiro', 'talheres'],            emoji: '🎁' },
  { keywords: ['liquidificador', 'mixer', 'processador'],  emoji: '🎁' },
  { keywords: ['geladeira', 'refrigerador'],               emoji: '🎁' },
  { keywords: ['microondas'],                              emoji: '🎁' },
  { keywords: ['cafeteira', 'café', 'nespresso'],          emoji: '🎁' },
  { keywords: ['batedeira'],                               emoji: '🎁' },
  { keywords: ['torradeira'],                              emoji: '🎁' },
  { keywords: ['lençol', 'cama', 'travesseiro', 'roupa'],  emoji: '🎁' },
  { keywords: ['toalha'],                                  emoji: '🎁' },
  { keywords: ['vassoura', 'rodo', 'limpeza'],             emoji: '🎁' },
  { keywords: ['copo', 'taça', 'xícara'],                  emoji: '🎁' },
  { keywords: ['prato', 'tigela', 'bowl'],                 emoji: '🎁' },
  { keywords: ['vela', 'difusor', 'aromatizador'],         emoji: '🎁' },
  { keywords: ['quadro', 'decoração', 'espelho'],          emoji: '🎁' },
  { keywords: ['tapete'],                                  emoji: '🎁' },
  { keywords: ['ferramenta', 'chave', 'parafuso'],         emoji: '🎁' },
  { keywords: ['livro'],                                   emoji: '🎁' },
  { keywords: ['jogo', 'conjunto', 'kit'],                 emoji: '🎁' },
];

/**
 * Retorna um emoji com base no nome do presente.
 * @param {string} nome
 * @returns {string}
 */
function getEmoji(nome) {
  const lower = nome.toLowerCase();
  for (const { keywords, emoji } of EMOJI_MAP) {
    if (keywords.some(k => lower.includes(k))) return emoji;
  }
  return '🎁'; // fallback
}

// ───────────────────────────────────────────────────────────────
// 3. ESTADO DA APLICAÇÃO
// ───────────────────────────────────────────────────────────────
const state = {
  presentes: [],        // lista completa vinda do Supabase
  filtroAtivo: 'all',   // 'all' | 'available' | 'reserved'
  busca: '',            // texto digitado na busca
  presenteSelecionado: null, // item sendo reservado no modal
};

// ───────────────────────────────────────────────────────────────
// 4. REFERÊNCIAS AOS ELEMENTOS DO DOM
// ───────────────────────────────────────────────────────────────
const dom = {
  grid:            document.getElementById('gifts-grid'),
  emptyState:      document.getElementById('empty-state'),
  statsText:       document.getElementById('stats-text'),
  searchInput:     document.getElementById('search-input'),
  searchClear:     document.getElementById('search-clear'),
  filterAll:       document.getElementById('filter-all'),
  filterAvailable: document.getElementById('filter-available'),
  filterReserved:  document.getElementById('filter-reserved'),
  progressFill:    document.getElementById('progress-bar-fill'),
  progressGlow:    document.getElementById('progress-bar-glow'),
  progressText:    document.getElementById('progress-text'),
  progressPercent: document.getElementById('progress-percent'),
  progressTrack:   document.getElementById('progress-bar-track'),
  modalOverlay:    document.getElementById('modal-overlay'),
  modalClose:      document.getElementById('modal-close'),
  modalGiftName:   document.getElementById('modal-gift-name'),
  modalForm:       document.getElementById('modal-form'),
  inputNome:       document.getElementById('input-nome'),
  inputSobrenome:  document.getElementById('input-sobrenome'),
  errorNome:       document.getElementById('error-nome'),
  errorSobrenome:  document.getElementById('error-sobrenome'),
  btnConfirm:      document.getElementById('btn-confirm'),
  btnConfirmText:  document.querySelector('.btn-confirm__text'),
  btnConfirmLoader:document.querySelector('.btn-confirm__loader'),
  toast:           document.getElementById('toast'),
  toastMsg:        document.getElementById('toast-msg'),
};

// ───────────────────────────────────────────────────────────────
// 5. SUPABASE — CARREGAR PRESENTES
//    Lê todos os registros da tabela 'presentes' (ordenados por id).
// ───────────────────────────────────────────────────────────────

/**
 * Busca a lista de presentes no Supabase e atualiza o estado + UI.
 */
async function carregarPresentes() {
  try {
    const { data, error } = await db
      .from('presentes')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    state.presentes = data || [];
    renderUI();
  } catch (err) {
    console.error('[Supabase] Erro ao carregar presentes:', err.message);
    mostrarErroDeConexao();
  }
}

// ───────────────────────────────────────────────────────────────
// 6. SUPABASE — RESERVAR PRESENTE
//    Atualiza reservado=true e reservado_por='Nome Sobrenome'.
// ───────────────────────────────────────────────────────────────

/**
 * Envia a reserva para o Supabase e atualiza o estado local.
 * @param {number|string} id       — ID do registro na tabela
 * @param {string}        nomeCompleto — Nome do convidado
 * @returns {Promise<boolean>}
 */
async function reservarPresente(id, nomeCompleto) {
  try {
    const { error } = await db
      .from('presentes')
      .update({ reservado: true, reservado_por: nomeCompleto })
      .eq('id', id);

    if (error) throw error;

    // Atualiza o item localmente para não precisar de nova requisição
    const idx = state.presentes.findIndex(p => p.id === id);
    if (idx !== -1) {
      state.presentes[idx].reservado     = true;
      state.presentes[idx].reservado_por = nomeCompleto;
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Erro ao reservar presente:', err.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────
// 6b. SUPABASE — CANCELAR RESERVA
//     Limpa os campos reservado e reservado_por na tabela.
// ─────────────────────────────────────────────────────────────────

/**
 * Cancela a reserva de um presente após validação de senha e confirmação.
 * @param {number|string} itemId — ID do registro na tabela
 */
async function cancelarReserva(itemId) {
  // 1. Pede a senha de autorização
  const senha = prompt('🔒 Digite a senha para desfazer a reserva:');

  // Usuário fechou o prompt
  if (senha === null) return;

  // Senha incorreta
  if (senha !== 'remove123') {
    alert('❌ Senha incorreta. Acesso negado.');
    return;
  }

  // 2. Confirmação final
  const confirmado = confirm('Tem certeza que deseja cancelar a reserva deste presente?');
  if (!confirmado) return;

  try {
    const { error } = await db
      .from('presentes')
      .update({ reservado: false, reservado_por: null })
      .eq('id', itemId);

    if (error) throw error;

    alert('Reserva cancelada com sucesso!');
    location.reload();
  } catch (err) {
    console.error('[Supabase] Erro ao cancelar reserva:', err.message);
    alert('Ops! Não foi possível cancelar a reserva. Tente novamente.');
  }
}


// ───────────────────────────────────────────────────────────────
// 7. RENDERIZAÇÃO DA UI
// ───────────────────────────────────────────────────────────────

/** Filtra e renderiza os cards + atualiza progress bar e stats. */
function renderUI() {
  const filtrados = filtrarPresentes();
  atualizarProgressBar();
  atualizarStats(filtrados.length);
  renderCards(filtrados);
}

/** Retorna a lista filtrada com base em busca + filtroAtivo. */
function filtrarPresentes() {
  return state.presentes.filter(p => {
    const nomeLower = (p.nome || '').toLowerCase();

    // Filtro de busca
    const matchBusca = nomeLower.includes(state.busca.toLowerCase());

    // Filtro de status
    const matchFiltro =
      state.filtroAtivo === 'all'       ? true :
      state.filtroAtivo === 'available' ? !p.reservado :
      /* 'reserved' */                    p.reservado;

    return matchBusca && matchFiltro;
  });
}

/** Atualiza a barra de progresso. */
function atualizarProgressBar() {
  const total     = state.presentes.length;
  const reservados = state.presentes.filter(p => p.reservado).length;
  const pct       = total > 0 ? Math.round((reservados / total) * 100) : 0;

  dom.progressFill.style.width   = pct + '%';
  dom.progressGlow.style.left    = `calc(${pct}% - 8px)`;
  dom.progressGlow.style.display = pct > 0 ? 'block' : 'none';
  dom.progressText.textContent   = `${reservados} de ${total}`;
  dom.progressPercent.textContent = pct + '%';
  dom.progressTrack.setAttribute('aria-valuenow', pct);
}

/** Atualiza o texto de estatísticas abaixo dos filtros. */
function atualizarStats(visiveisCount) {
  const total      = state.presentes.length;
  const reservados = state.presentes.filter(p => p.reservado).length;
  const disponiveis = total - reservados;

  if (total === 0) {
    dom.statsText.textContent = 'Nenhum presente cadastrado ainda.';
    return;
  }

  const parteVisivel = visiveisCount !== total
    ? `Exibindo ${visiveisCount} de ${total} •  `
    : '';

  dom.statsText.textContent =
    `${parteVisivel}${disponiveis} disponíve${disponiveis !== 1 ? 'is' : 'l'} · ${reservados} reservado${reservados !== 1 ? 's' : ''}`;
}

/** Renderiza os cards no grid. */
function renderCards(lista) {
  // Limpa skeletons e cards anteriores
  dom.grid.innerHTML = '';

  if (lista.length === 0) {
    dom.emptyState.hidden = false;
    return;
  }

  dom.emptyState.hidden = true;

  lista.forEach((presente, idx) => {
    const card = criarCard(presente, idx);
    dom.grid.appendChild(card);
  });
}

/** Cria e retorna o elemento HTML de um card de presente. */
function criarCard(presente, idx) {
  const { id, nome, reservado, reservado_por } = presente;
  const emoji = getEmoji(nome || '');

  const article = document.createElement('article');
  article.className = `gift-card${reservado ? ' gift-card--reserved' : ''}`;
  article.setAttribute('aria-label', `${nome} — ${reservado ? `Reservado por ${reservado_por}` : 'Disponível'}`);

  // Badge de status
  const badgeClass = reservado ? 'badge--reserved' : 'badge--available';
  const badgeText  = reservado
    ? `Reservado por ${escapeHtml(reservado_por || 'Alguém')}`
    : 'Disponível';

  // Botão condicional: "Quero Presentear" (disponível) ou "Desfazer Reserva" (reservado)
  const btnHTML = reservado
    ? `<button
         class="btn-cancelar"
         data-id="${id}"
         aria-label="Desfazer reserva de ${escapeAttr(nome)}"
       >❌ Desfazer Reserva</button>`
    : `<button
         class="btn-gift"
         data-id="${id}"
         data-nome="${escapeAttr(nome)}"
         aria-label="Quero presentear com ${escapeAttr(nome)}"
       >🎁 Quero Presentear</button>`;

  article.innerHTML = `
    <div class="gift-card__icon" aria-hidden="true">${emoji}</div>
    <div class="gift-card__body">
      <h2 class="gift-card__name">${escapeHtml(nome || 'Presente')}</h2>
      <span class="badge ${badgeClass}">${badgeText}</span>
    </div>
    ${btnHTML}
  `;

  // Evento nos botões
  if (reservado) {
    const btn = article.querySelector('.btn-cancelar');
    btn.addEventListener('click', () => cancelarReserva(id));
  } else {
    const btn = article.querySelector('.btn-gift');
    btn.addEventListener('click', () => abrirModal(presente));
  }

  return article;
}

// ───────────────────────────────────────────────────────────────
// 8. MODAL
// ───────────────────────────────────────────────────────────────

/** Abre o modal para reservar o presente informado. */
function abrirModal(presente) {
  state.presenteSelecionado = presente;
  dom.modalGiftName.textContent = presente.nome;
  dom.inputNome.value      = '';
  dom.inputSobrenome.value = '';
  dom.errorNome.textContent      = '';
  dom.errorSobrenome.textContent = '';
  dom.inputNome.classList.remove('form-input--error');
  dom.inputSobrenome.classList.remove('form-input--error');
  dom.modalOverlay.hidden = false;
  requestAnimationFrame(() => dom.inputNome.focus());

  // Bloqueia scroll do body
  document.body.style.overflow = 'hidden';
}

/** Fecha o modal e limpa o estado de seleção. */
function fecharModal() {
  dom.modalOverlay.hidden = true;
  state.presenteSelecionado = null;
  document.body.style.overflow = '';
}

/** Valida os campos do formulário e retorna true se OK. */
function validarFormulario() {
  let valido = true;

  if (!dom.inputNome.value.trim()) {
    dom.errorNome.textContent = 'Por favor, informe seu nome.';
    dom.inputNome.classList.add('form-input--error');
    valido = false;
  } else {
    dom.errorNome.textContent = '';
    dom.inputNome.classList.remove('form-input--error');
  }

  if (!dom.inputSobrenome.value.trim()) {
    dom.errorSobrenome.textContent = 'Por favor, informe seu sobrenome.';
    dom.inputSobrenome.classList.add('form-input--error');
    valido = false;
  } else {
    dom.errorSobrenome.textContent = '';
    dom.inputSobrenome.classList.remove('form-input--error');
  }

  return valido;
}

/** Controla o estado de loading do botão de confirmar. */
function setLoadingConfirm(loading) {
  dom.btnConfirm.disabled = loading;
  dom.btnConfirmText.hidden   = loading;
  dom.btnConfirmLoader.hidden = !loading;
}

// ───────────────────────────────────────────────────────────────
// 9. TOAST
// ───────────────────────────────────────────────────────────────
let toastTimer = null;

/** Exibe um toast de notificação temporário. */
function mostrarToast(mensagem, duracao = 4000) {
  dom.toastMsg.textContent = mensagem;
  dom.toast.classList.add('toast--visible');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    dom.toast.classList.remove('toast--visible');
  }, duracao);
}

// ───────────────────────────────────────────────────────────────
// 10. TRATAMENTO DE ERRO DE CONEXÃO
// ───────────────────────────────────────────────────────────────
function mostrarErroDeConexao() {
  dom.grid.innerHTML = `
    <div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state__icon">⚠️</div>
      <h2 class="empty-state__title">Erro de conexão</h2>
      <p class="empty-state__text">Não foi possível carregar os presentes. Verifique as configurações do Supabase e recarregue a página.</p>
    </div>`;
  dom.statsText.textContent = 'Erro ao conectar com o banco de dados.';
}

// ───────────────────────────────────────────────────────────────
// 11. UTILITÁRIOS DE SEGURANÇA
// ───────────────────────────────────────────────────────────────

/** Escapa caracteres HTML para evitar XSS. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapa para uso em atributos HTML. */
function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ───────────────────────────────────────────────────────────────
// 12. EVENT LISTENERS
// ───────────────────────────────────────────────────────────────

// ---- Busca em tempo real ----
dom.searchInput.addEventListener('input', () => {
  state.busca = dom.searchInput.value;
  dom.searchClear.hidden = !state.busca;
  renderUI();
});

dom.searchClear.addEventListener('click', () => {
  dom.searchInput.value = '';
  dom.searchInput.focus();
  state.busca = '';
  dom.searchClear.hidden = true;
  renderUI();
});

// ---- Filtros ----
const filterBtns = [dom.filterAll, dom.filterAvailable, dom.filterReserved];

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    state.filtroAtivo = btn.dataset.filter;
    filterBtns.forEach(b => b.classList.remove('filter-btn--active'));
    btn.classList.add('filter-btn--active');
    renderUI();
  });
});

// ---- Modal: fechar ----
dom.modalClose.addEventListener('click', fecharModal);

dom.modalOverlay.addEventListener('click', (e) => {
  if (e.target === dom.modalOverlay) fecharModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !dom.modalOverlay.hidden) fecharModal();
});

// ---- Modal: submeter formulário ----
dom.modalForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validarFormulario()) return;
  if (!state.presenteSelecionado) return;

  const nome      = dom.inputNome.value.trim();
  const sobrenome = dom.inputSobrenome.value.trim();
  const nomePleno = `${nome} ${sobrenome}`;
  const id        = state.presenteSelecionado.id;

  setLoadingConfirm(true);

  const sucesso = await reservarPresente(id, nomePleno);

  setLoadingConfirm(false);

  if (sucesso) {
    fecharModal();
    renderUI();
    mostrarToast(`🎉 Obrigado, ${nome}! Seu presente foi reservado com sucesso!`);
  } else {
    mostrarToast('❌ Ops! Algo deu errado. Tente novamente.', 5000);
  }
});

// ---- Limpa erro de input ao digitar ----
dom.inputNome.addEventListener('input', () => {
  if (dom.inputNome.value.trim()) {
    dom.errorNome.textContent = '';
    dom.inputNome.classList.remove('form-input--error');
  }
});

dom.inputSobrenome.addEventListener('input', () => {
  if (dom.inputSobrenome.value.trim()) {
    dom.errorSobrenome.textContent = '';
    dom.inputSobrenome.classList.remove('form-input--error');
  }
});

// ─────────────────────────────────────────────────────────────────
// 13. INICIALIZAÇÃO
// ─────────────────────────────────────────────────────────────────

// ---- Tema escuro ----
const htmlEl      = document.documentElement;
const toggleBtn   = document.getElementById('theme-toggle');
const THEME_KEY   = 'cha-theme';

/**
 * Aplica o tema ao <html> e atualiza o ícone do botão.
 * @param {'dark'|'light'} theme
 */
function aplicarTema(theme) {
  if (theme === 'dark') {
    htmlEl.classList.add('dark');
    toggleBtn.textContent = '🌙';
    toggleBtn.setAttribute('aria-label', 'Mudar para tema claro');
  } else {
    htmlEl.classList.remove('dark');
    toggleBtn.textContent = '☀️';
    toggleBtn.setAttribute('aria-label', 'Mudar para tema escuro');
  }
  localStorage.setItem(THEME_KEY, theme);
}

// Detecta preferência: localStorage > sistema operacional
const temaSalvo   = localStorage.getItem(THEME_KEY);
const prefSistema = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
aplicarTema(temaSalvo || prefSistema);

// Evento do botão toggle
toggleBtn.addEventListener('click', () => {
  aplicarTema(htmlEl.classList.contains('dark') ? 'light' : 'dark');
});

// ---- Carrega os presentes ----
carregarPresentes();
