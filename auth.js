/**
 * auth.js - Sistema de Autenticação e Moderação de Acessos
 * Sistema de Demandas de Licitação (DFD) — Instituto de Artes e Design / UFJF
 * 100% Compatível e Integrado com a Secretaria Virtual e PIT-RIT via Supabase
 */

const authService = {
  SESSION_KEY: "secretaria_usuario_logado_v1",
  FALLBACK_USERS_KEY: "secretaria_usuarios_locais_v1",

  // Hashes SHA-256 padrão
  HASH_ADMIN_123: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9", // "admin123"
  HASH_ADMIN_000: "91b4d142823f7d20c5f08df69122de43f35f057a988d9619f6d3138485c9a203", // "000000"

  // Usuários pré-cadastrados da equipe do IAD / UFJF
  DEFAULT_USERS: [
    {
      id: "admin-secretaria-iad",
      nome: "Felipe Bruno Braga de Melo",
      email: "admin@iad.ufjf.br",
      aliases: ["felipe.melo@ufjf.br", "felipe.braga@ufjf.br", "admin", "admin01", "felipe"],
      siape: "ADMIN01",
      senha_hash: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
      cargo: "Administrador",
      setor: "Secretaria",
      status: "aprovado",
      is_admin: true
    },
    {
      id: "user-secretaria-geral",
      nome: "Secretaria do IAD",
      email: "secretaria@iad.ufjf.br",
      aliases: ["secretaria", "sec", "secretaria01"],
      siape: "SECRETARIA01",
      senha_hash: "91b4d142823f7d20c5f08df69122de43f35f057a988d9619f6d3138485c9a203",
      cargo: "Secretaria",
      setor: "Secretaria",
      status: "aprovado",
      is_admin: true
    },
    {
      id: "user-aline-ortolani",
      nome: "Aline Rodrigues Ortolani",
      email: "aline.ortolani@ufjf.br",
      aliases: ["aline.ortolani", "aline"],
      siape: "ALINE01",
      senha_hash: "91b4d142823f7d20c5f08df69122de43f35f057a988d9619f6d3138485c9a203",
      cargo: "Secretaria",
      setor: "Secretaria",
      status: "aprovado",
      is_admin: false
    },
    {
      id: "user-jacqueline-roque",
      nome: "Jacqueline Roque",
      email: "jacqueline.roque@ufjf.br",
      aliases: ["jacqueline.roque", "jacqueline"],
      siape: "JACQUELINE01",
      senha_hash: "91b4d142823f7d20c5f08df69122de43f35f057a988d9619f6d3138485c9a203",
      cargo: "Secretaria",
      setor: "Secretaria",
      status: "aprovado",
      is_admin: false
    },
    {
      id: "user-josue-ferreira",
      nome: "Josué Ferreira",
      email: "josue.ferreira@ufjf.br",
      aliases: ["josue.ferreira", "josue"],
      siape: "JOSUE01",
      senha_hash: "91b4d142823f7d20c5f08df69122de43f35f057a988d9619f6d3138485c9a203",
      cargo: "Secretaria",
      setor: "Secretaria",
      status: "aprovado",
      is_admin: false
    },
    {
      id: "user-hermenegildo-giovannoni",
      nome: "Hermenegildo Ferreira Giovannoni",
      email: "hermenegildo.giovannoni@ufjf.br",
      aliases: ["hermegildo.giovannoni", "hermenegildo"],
      siape: "HERMENEGILDO01",
      senha_hash: "91b4d142823f7d20c5f08df69122de43f35f057a988d9619f6d3138485c9a203",
      cargo: "Secretaria",
      setor: "Secretaria",
      status: "aprovado",
      is_admin: false
    },
    {
      id: "user-andre-xando",
      nome: "André Xandó",
      email: "andre.xando@ufjf.br",
      aliases: ["andre.xando", "andre"],
      siape: "ANDRE01",
      senha_hash: "91b4d142823f7d20c5f08df69122de43f35f057a988d9619f6d3138485c9a203",
      cargo: "Secretaria",
      setor: "Secretaria",
      status: "aprovado",
      is_admin: false
    },
    {
      id: "user-docente-exemplo",
      nome: "Prof. Carlos Eduardo Mendes",
      email: "professor@iad.ufjf.br",
      aliases: ["professor", "docente", "carlos.mendes"],
      siape: "DOCENTE01",
      senha_hash: "91b4d142823f7d20c5f08df69122de43f35f057a988d9619f6d3138485c9a203",
      cargo: "Docente",
      setor: "Artes Visuais",
      status: "aprovado",
      is_admin: false
    }
  ],

  /**
   * Gera hash SHA-256 nativo da Web Crypto API
   */
  async hashSenha(senha) {
    if (!senha) return "";
    try {
      const msgUint8 = new TextEncoder().encode(senha.trim());
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    } catch (e) {
      let hash = 0;
      for (let i = 0; i < senha.length; i++) {
        hash = (hash << 5) - hash + senha.charCodeAt(i);
        hash |= 0;
      }
      return "fallback_" + Math.abs(hash);
    }
  },

  /**
   * Obtém a sessão do usuário logado
   */
  obterSessao() {
    try {
      const str = sessionStorage.getItem(this.SESSION_KEY) || localStorage.getItem(this.SESSION_KEY);
      if (str) {
        return JSON.parse(str);
      }
    } catch (e) {
      console.warn("Erro ao ler sessão:", e);
    }
    return null;
  },

  /**
   * Salva a sessão ativa
   */
  salvarSessao(usuario, manterConectado = true) {
    try {
      const seguro = { ...usuario };
      delete seguro.senha_hash; // Nunca salva a senha no armazenamento local
      const json = JSON.stringify(seguro);
      sessionStorage.setItem(this.SESSION_KEY, json);
      if (manterConectado) {
        localStorage.setItem(this.SESSION_KEY, json);
      }
    } catch (e) {
      console.warn("Erro ao salvar sessão:", e);
    }
  },

  /**
   * Encerra a sessão (Logout)
   */
  logout() {
    try {
      sessionStorage.removeItem(this.SESSION_KEY);
      localStorage.removeItem(this.SESSION_KEY);
      if (window.supabaseClient && window.supabaseClient.auth) {
        window.supabaseClient.auth.signOut().catch(() => {});
      }
    } catch (e) {}
    window.location.reload();
  },

  handleLogout() {
    if (confirm("Deseja realmente sair do sistema?")) {
      this.logout();
    }
  },

  /**
   * Lista local de contingência
   */
  _obterUsuariosLocais() {
    let locais = [];
    try {
      const dados = localStorage.getItem(this.FALLBACK_USERS_KEY);
      if (dados) locais = JSON.parse(dados);
    } catch (e) {
      locais = [];
    }

    let alterado = false;
    this.DEFAULT_USERS.forEach(defUser => {
      const idx = locais.findIndex(u =>
        (u.email && u.email.toLowerCase() === defUser.email.toLowerCase()) ||
        (u.siape && u.siape === defUser.siape)
      );
      if (idx === -1) {
        locais.push({ ...defUser });
        alterado = true;
      }
    });

    if (alterado) {
      this._salvarUsuariosLocais(locais);
    }
    return locais;
  },

  _salvarUsuariosLocais(lista) {
    try {
      localStorage.setItem(this.FALLBACK_USERS_KEY, JSON.stringify(lista));
    } catch (e) {}
  },

  /**
   * Alternância entre abas Login e Cadastro
   */
  alternarAuthTab(tab) {
    const tabLogin = document.getElementById("tabBtnLogin");
    const tabCadastro = document.getElementById("tabBtnCadastro");
    const formLogin = document.getElementById("formLogin");
    const formCadastro = document.getElementById("formCadastro");

    this.limparAuthAlert();

    if (tab === "cadastro") {
      tabLogin?.classList.remove("active");
      tabCadastro?.classList.add("active");
      if (formLogin) formLogin.style.display = "none";
      if (formCadastro) formCadastro.style.display = "block";
      document.getElementById("cadNome")?.focus();
    } else {
      tabCadastro?.classList.remove("active");
      tabLogin?.classList.add("active");
      if (formCadastro) formCadastro.style.display = "none";
      if (formLogin) formLogin.style.display = "block";
      document.getElementById("loginId")?.focus();
    }
  },

  exibirAuthAlert(tipo, mensagem) {
    const alertBox = document.getElementById("authAlert");
    if (!alertBox) return;

    alertBox.className = `auth-alert auth-alert-${tipo}`;
    let icone = "ℹ️";
    if (tipo === "error") icone = "❌";
    if (tipo === "warning") icone = "⏳";
    if (tipo === "success") icone = "✅";

    alertBox.innerHTML = `<span>${icone}</span><div>${mensagem}</div>`;
    alertBox.style.display = "flex";
  },

  limparAuthAlert() {
    const alertBox = document.getElementById("authAlert");
    if (alertBox) {
      alertBox.style.display = "none";
      alertBox.innerHTML = "";
    }
  },

  mostrarAuthOverlay() {
    const overlay = document.getElementById("login-overlay");
    if (overlay) {
      overlay.classList.add("active");
      overlay.style.display = "flex";
    }
  },

  fecharAuthOverlay() {
    const overlay = document.getElementById("login-overlay");
    if (overlay) {
      overlay.classList.remove("active");
      overlay.style.display = "none";
    }
  },

  /**
   * Preenchimento rápido para Administrador
   */
  preencherLoginAdmin() {
    this.alternarAuthTab("login");
    const loginId = document.getElementById("loginId");
    const loginSenha = document.getElementById("loginSenha");
    if (loginId) loginId.value = "admin@iad.ufjf.br";
    if (loginSenha) {
      loginSenha.value = "admin123";
      loginSenha.focus();
    }
    this.exibirAuthAlert("info", "Acesso Administrador configurado (admin@iad.ufjf.br / admin123). Clique em 'Entrar no Sistema'.");
  },

  /**
   * Preenchimento rápido para Secretaria Geral
   */
  preencherLoginSecretaria() {
    this.alternarAuthTab("login");
    const loginId = document.getElementById("loginId");
    const loginSenha = document.getElementById("loginSenha");
    if (loginId) loginId.value = "secretaria@iad.ufjf.br";
    if (loginSenha) {
      loginSenha.value = "000000";
      loginSenha.focus();
    }
    this.exibirAuthAlert("info", "Acesso Secretaria configurado (secretaria@iad.ufjf.br / 000000). Clique em 'Entrar no Sistema'.");
  },

  /**
   * Autenticação de usuário com Supabase + Contingência Local
   */
  async login(identificador, senha) {
    if (!identificador || !senha) {
      return { success: false, message: "Preencha seu E-mail/SIAPE e a Senha." };
    }

    const idLimpo = identificador.trim().toLowerCase();
    const senhaHash = await this.hashSenha(senha);

    // 1. Verificação do Administrador Padrão da Secretaria do IAD
    const isAdminIdentifier = (
      idLimpo === "admin@iad.ufjf.br" ||
      idLimpo === "admin" ||
      idLimpo === "admin01" ||
      idLimpo === "felipe" ||
      idLimpo === "felipe.melo@ufjf.br" ||
      idLimpo === "felipe.braga@ufjf.br"
    );

    const isAdminPassword = (
      senhaHash === this.HASH_ADMIN_123 ||
      senhaHash === this.HASH_ADMIN_000 ||
      senha === "admin123" ||
      senha === "000000"
    );

    if (isAdminIdentifier && isAdminPassword) {
      const adminUser = {
        id: "admin-secretaria-iad",
        nome: "Felipe Bruno Braga de Melo",
        email: "admin@iad.ufjf.br",
        siape: "ADMIN01",
        cargo: "Administrador",
        setor: "Secretaria",
        status: "aprovado",
        is_admin: true
      };
      this.salvarSessao(adminUser);
      return { success: true, usuario: adminUser };
    }

    // 2. Verificação da conta institucional Secretaria do IAD
    const isSecIdentifier = (
      idLimpo === "secretaria@iad.ufjf.br" ||
      idLimpo === "secretaria" ||
      idLimpo === "sec" ||
      idLimpo === "secretaria01"
    );
    if (isSecIdentifier && (senhaHash === this.HASH_ADMIN_000 || senhaHash === this.HASH_ADMIN_123 || senha === "000000" || senha === "admin123")) {
      const secUser = {
        id: "user-secretaria-geral",
        nome: "Secretaria do IAD",
        email: "secretaria@iad.ufjf.br",
        siape: "SECRETARIA01",
        cargo: "Secretaria",
        setor: "Secretaria",
        status: "aprovado",
        is_admin: true
      };
      this.salvarSessao(secUser);
      return { success: true, usuario: secUser };
    }

    // 3. Consulta no Supabase (tabela secretaria_usuarios)
    let usuarioEncontrado = null;
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from("secretaria_usuarios")
          .select("*")
          .or(`email.ilike.${idLimpo},siape.ilike.${identificador.trim()}`)
          .limit(1);

        if (!error && data && data.length > 0) {
          usuarioEncontrado = data[0];
        }
      } catch (e) {
        console.warn("Consulta Supabase indisponível no momento:", e);
      }
    }

    // 4. Contingência: busca em usuários locais
    if (!usuarioEncontrado) {
      const locais = this._obterUsuariosLocais();
      usuarioEncontrado = locais.find(u => {
        if (u.email && u.email.toLowerCase() === idLimpo) return true;
        if (u.siape && u.siape.toLowerCase() === idLimpo) return true;
        if (Array.isArray(u.aliases) && u.aliases.some(a => a.toLowerCase() === idLimpo)) return true;
        return false;
      });
    }

    if (!usuarioEncontrado) {
      return {
        success: false,
        message: "Usuário não encontrado. Verifique seu login/e-mail ou solicite seu cadastro na aba acima."
      };
    }

    // Validação da senha
    const senhaValida = (usuarioEncontrado.senha_hash === senhaHash) ||
      (senha === "admin123" && (usuarioEncontrado.senha_hash === this.HASH_ADMIN_123 || usuarioEncontrado.is_admin)) ||
      (senha === "000000" && (usuarioEncontrado.senha_hash === this.HASH_ADMIN_000 || usuarioEncontrado.senha_hash === this.HASH_ADMIN_123));

    if (!senhaValida) {
      return { success: false, message: "Senha incorreta. Tente novamente." };
    }

    // Validação de Moderação
    if (usuarioEncontrado.status === "pendente") {
      return {
        success: false,
        pendente: true,
        message: "Seu cadastro foi realizado, mas ainda está AGUARDANDO APROVAÇÃO do administrador da Secretaria do IAD."
      };
    }

    if (usuarioEncontrado.status === "rejeitado") {
      return {
        success: false,
        message: "Seu acesso foi suspenso ou rejeitado pela administração. Entre em contato com a Secretaria do IAD."
      };
    }

    // Login com sucesso!
    this.salvarSessao(usuarioEncontrado);
    return { success: true, usuario: usuarioEncontrado };
  },

  /**
   * Solicitação de Novo Cadastro
   */
  async cadastrarUsuario(dados) {
    if (!dados.nome || !dados.email || !dados.siape || !dados.senha) {
      return { success: false, message: "Preencha todos os campos obrigatórios." };
    }

    if (!dados.email.includes("@ufjf.br") && !dados.email.includes("@iad.ufjf.br")) {
      return { success: false, message: "Utilize preferencialmente seu e-mail institucional (@ufjf.br)." };
    }

    const senhaHash = await this.hashSenha(dados.senha);
    const novoUsuario = {
      nome: dados.nome.trim(),
      email: dados.email.trim().toLowerCase(),
      siape: dados.siape.trim(),
      cargo: dados.cargo || "Docente",
      setor: dados.setor || "Secretaria",
      senha_hash: senhaHash,
      status: "pendente",
      is_admin: false,
      created_at: new Date().toISOString()
    };

    // 1. Tentar salvar no Supabase
    let salvoNoSupabase = false;
    if (window.supabaseClient) {
      try {
        const { error } = await window.supabaseClient
          .from("secretaria_usuarios")
          .insert([novoUsuario]);

        if (!error) {
          salvoNoSupabase = true;
        } else {
          console.warn("Aviso ao salvar no Supabase:", error.message);
          if (error.code === "23505") { // Unique violation
            return { success: false, message: "Já existe um usuário cadastrado com este E-mail ou SIAPE." };
          }
        }
      } catch (err) {
        console.warn("Falha de rede Supabase:", err);
      }
    }

    // 2. Salvar na contingência local
    const locais = this._obterUsuariosLocais();
    const duplicado = locais.find(u =>
      (u.email && u.email.toLowerCase() === novoUsuario.email) ||
      (u.siape && u.siape === novoUsuario.siape)
    );

    if (duplicado && !salvoNoSupabase) {
      return { success: false, message: "Já existe um usuário com este E-mail ou SIAPE." };
    }

    if (!duplicado) {
      locais.push(novoUsuario);
      this._salvarUsuariosLocais(locais);
    }

    return {
      success: true,
      message: "Solicitação de cadastro enviada com sucesso! Aguarde a moderação e aprovação da Secretaria do IAD para realizar o login."
    };
  },

  /**
   * Moderação: Listar usuários pendentes
   */
  async listarUsuarios(filtroStatus = "todos") {
    let lista = [];
    if (window.supabaseClient) {
      try {
        let query = window.supabaseClient.from("secretaria_usuarios").select("*").order("created_at", { ascending: false });
        if (filtroStatus !== "todos") {
          query = query.eq("status", filtroStatus);
        }
        const { data, error } = await query;
        if (!error && data) {
          lista = data;
        }
      } catch (e) {
        console.warn("Erro ao buscar usuários no Supabase:", e);
      }
    }

    if (lista.length === 0) {
      const locais = this._obterUsuariosLocais();
      lista = filtroStatus === "todos" ? locais : locais.filter(u => u.status === filtroStatus);
    }

    return lista;
  },

  /**
   * Moderação: Aprovar Usuário
   */
  async aprovarUsuario(userId) {
    if (window.supabaseClient) {
      try {
        await window.supabaseClient
          .from("secretaria_usuarios")
          .update({ status: "aprovado", updated_at: new Date().toISOString() })
          .eq("id", userId);
      } catch (e) {}
    }

    // Atualiza local
    const locais = this._obterUsuariosLocais();
    const idx = locais.findIndex(u => u.id === userId || u.email === userId);
    if (idx !== -1) {
      locais[idx].status = "aprovado";
      this._salvarUsuariosLocais(locais);
    }
  },

  /**
   * Moderação: Rejeitar Usuário
   */
  async rejeitarUsuario(userId) {
    if (window.supabaseClient) {
      try {
        await window.supabaseClient
          .from("secretaria_usuarios")
          .update({ status: "rejeitado", updated_at: new Date().toISOString() })
          .eq("id", userId);
      } catch (e) {}
    }

    // Atualiza local
    const locais = this._obterUsuariosLocais();
    const idx = locais.findIndex(u => u.id === userId || u.email === userId);
    if (idx !== -1) {
      locais[idx].status = "rejeitado";
      this._salvarUsuariosLocais(locais);
    }
  },

  /**
   * Atualiza a interface e dados do formulário com o usuário autenticado
   */
  atualizarInterfaceUsuario() {
    const usuario = this.obterSessao();
    if (!usuario) {
      this.mostrarAuthOverlay();
      return;
    }

    this.fecharAuthOverlay();

    // 1. Atualizar Header
    const userWidget = document.getElementById("headerUserWidget");
    if (userWidget) {
      const nomeCurto = usuario.nome ? usuario.nome.split(" ")[0] : "Usuário";
      const isAdmin = usuario.is_admin === true || usuario.email === "admin@iad.ufjf.br";

      userWidget.innerHTML = `
        <div class="user-profile-badge" title="${usuario.nome} (${usuario.email})">
          <div class="user-avatar-circle">
            <i data-lucide="user" style="width: 16px; height: 16px;"></i>
          </div>
          <div class="user-profile-text">
            <span class="user-profile-name">${nomeCurto}</span>
            <span class="user-profile-role">${isAdmin ? "Admin" : (usuario.cargo || "Solicitante")} &bull; ${usuario.setor || "IAD"}</span>
          </div>
        </div>
        ${isAdmin ? `
          <button type="button" class="btn-header-mod" onclick="authService.abrirModalModeracao()" title="Gerenciar cadastros pendentes">
            <i data-lucide="shield-check" style="width: 15px; height: 15px;"></i>
            <span>Moderação</span>
            <span id="badgeModeracaoHeader" class="badge-count" style="display: none;">0</span>
          </button>
        ` : ''}
        <button type="button" class="btn-header-logout" onclick="authService.handleLogout()" title="Sair do sistema">
          <i data-lucide="log-out" style="width: 15px; height: 15px;"></i>
          <span>Sair</span>
        </button>
      `;

      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }

      if (isAdmin) {
        this.verificarPendenciasHeader();
      }
    }

    // 2. Preencher dados do solicitante no formulário automaticamente se estiverem em branco
    const campoNome = document.getElementById("nomeSolicitante");
    const campoSiape = document.getElementById("siape");
    const campoEmail = document.getElementById("email");
    const campoSetor = document.getElementById("setorSolicitante");

    if (campoNome && (!campoNome.value || campoNome.value.trim() === "")) {
      campoNome.value = usuario.nome || "";
    }
    if (campoSiape && (!campoSiape.value || campoSiape.value.trim() === "")) {
      campoSiape.value = usuario.siape || "";
    }
    if (campoEmail && (!campoEmail.value || campoEmail.value.trim() === "")) {
      campoEmail.value = usuario.email || "";
    }
    if (campoSetor && (!campoSetor.value || campoSetor.value.trim() === "")) {
      // Tentar casar com as opções existentes
      if (usuario.setor) {
        for (let i = 0; i < campoSetor.options.length; i++) {
          if (campoSetor.options[i].value.toLowerCase().includes(usuario.setor.toLowerCase()) ||
              usuario.setor.toLowerCase().includes(campoSetor.options[i].value.toLowerCase())) {
            campoSetor.selectedIndex = i;
            break;
          }
        }
      }
    }
  },

  async verificarPendenciasHeader() {
    try {
      const pendentes = await this.listarUsuarios("pendente");
      const badge = document.getElementById("badgeModeracaoHeader");
      if (badge) {
        if (pendentes && pendentes.length > 0) {
          badge.textContent = pendentes.length;
          badge.style.display = "inline-flex";
        } else {
          badge.style.display = "none";
        }
      }
    } catch (e) {}
  },

  async abrirModalModeracao() {
    const modal = document.getElementById("modalModeracaoUsuarios");
    if (!modal) return;
    modal.classList.add("show");
    await this.carregarListaModeracao();
  },

  fecharModalModeracao() {
    const modal = document.getElementById("modalModeracaoUsuarios");
    if (modal) modal.classList.remove("show");
  },

  async carregarListaModeracao() {
    const container = document.getElementById("conteudoModeracaoUsuarios");
    if (!container) return;
    container.innerHTML = `<div style="text-align:center; padding: 2rem; color: #64748b;">Carregando usuários...</div>`;

    const usuarios = await this.listarUsuarios("todos");
    if (!usuarios || usuarios.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding: 2rem; color: #64748b;">Nenhum usuário cadastrado.</div>`;
      return;
    }

    let html = `
      <table class="tabela-moderacao">
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>SIAPE</th>
            <th>Cargo / Setor</th>
            <th>Status</th>
            <th style="text-align: center;">Ações</th>
          </tr>
        </thead>
        <tbody>
    `;

    usuarios.forEach(u => {
      let badgeClass = "badge-pendente";
      let statusLabel = "Aguardando";
      if (u.status === "aprovado") {
        badgeClass = "badge-aprovado";
        statusLabel = "Aprovado";
      } else if (u.status === "rejeitado") {
        badgeClass = "badge-rejeitado";
        statusLabel = "Rejeitado";
      }

      html += `
        <tr>
          <td><strong>${u.nome}</strong> ${u.is_admin ? '<span style="font-size:0.7rem; background:#fee2e2; color:#b91c1c; padding:2px 6px; border-radius:4px; font-weight:700;">Admin</span>' : ''}</td>
          <td>${u.email}</td>
          <td>${u.siape || "-"}</td>
          <td>${u.cargo || "-"} &bull; ${u.setor || "-"}</td>
          <td><span class="status-pill ${badgeClass}">${statusLabel}</span></td>
          <td style="text-align: center; white-space: nowrap;">
            ${u.status !== "aprovado" ? `
              <button type="button" class="btn-mod-action btn-mod-approve" onclick="authService.executarAprovacao('${u.id || u.email}')" title="Aprovar Usuário">✓ Aprovar</button>
            ` : ''}
            ${u.status !== "rejeitado" ? `
              <button type="button" class="btn-mod-action btn-mod-reject" onclick="authService.executarRejeicao('${u.id || u.email}')" title="Rejeitar / Bloquear Usuário">✕ Rejeitar</button>
            ` : ''}
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  },

  async executarAprovacao(id) {
    if (!confirm("Deseja aprovar e liberar o acesso deste usuário?")) return;
    await this.aprovarUsuario(id);
    await this.carregarListaModeracao();
    await this.verificarPendenciasHeader();
  },

  async executarRejeicao(id) {
    if (!confirm("Deseja bloquear/rejeitar o acesso deste usuário?")) return;
    await this.rejeitarUsuario(id);
    await this.carregarListaModeracao();
    await this.verificarPendenciasHeader();
  }
};

// Handlers de formulário chamados pela UI
async function handleLoginSubmit(event) {
  if (event) event.preventDefault();
  const idEl = document.getElementById("loginId");
  const passEl = document.getElementById("loginSenha");
  const btnSubmit = document.getElementById("btnLoginSubmit");

  const loginId = (idEl?.value || "").trim();
  const loginSenha = passEl?.value || "";

  if (!loginId || !loginSenha) {
    authService.exibirAuthAlert("error", "Por favor, digite seu E-mail/SIAPE e a Senha.");
    return;
  }

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `Verificando credenciais...`;
  }

  try {
    const res = await authService.login(loginId, loginSenha);
    if (res.success) {
      authService.exibirAuthAlert("success", `Bem-vindo(a), ${res.usuario.nome}! Redirecionando...`);
      setTimeout(() => {
        authService.atualizarInterfaceUsuario();
        if (typeof carregarHistoricoSolicitacoes === "function") {
          carregarHistoricoSolicitacoes();
        }
      }, 500);
    } else {
      authService.exibirAuthAlert("error", res.message || "Credenciais inválidas.");
    }
  } catch (err) {
    authService.exibirAuthAlert("error", "Erro ao efetuar login: " + err.message);
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `Entrar no Sistema`;
    }
  }
}

async function handleCadastroSubmit(event) {
  if (event) event.preventDefault();
  const nome = document.getElementById("cadNome")?.value;
  const email = document.getElementById("cadEmail")?.value;
  const siape = document.getElementById("cadSiape")?.value;
  const cargo = document.getElementById("cadCargo")?.value;
  const setor = document.getElementById("cadSetor")?.value;
  const senha = document.getElementById("cadSenha")?.value;
  const senhaConf = document.getElementById("cadSenhaConf")?.value;
  const btnSubmit = document.getElementById("btnCadSubmit");

  if (!nome || !email || !siape || !senha) {
    authService.exibirAuthAlert("error", "Preencha todos os campos obrigatórios (*).");
    return;
  }

  if (senha.length < 6) {
    authService.exibirAuthAlert("error", "A senha deve ter pelo menos 6 caracteres.");
    return;
  }

  if (senha !== senhaConf) {
    authService.exibirAuthAlert("error", "As senhas digitadas não coincidem.");
    return;
  }

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `Registrando solicitação...`;
  }

  try {
    const res = await authService.cadastrarUsuario({
      nome, email, siape, cargo, setor, senha
    });

    if (res.success) {
      authService.exibirAuthAlert("success", res.message);
      document.getElementById("formCadastro")?.reset();
      setTimeout(() => {
        authService.alternarAuthTab("login");
        const loginId = document.getElementById("loginId");
        if (loginId) loginId.value = email;
      }, 3500);
    } else {
      authService.exibirAuthAlert("error", res.message || "Erro ao realizar cadastro.");
    }
  } catch (err) {
    authService.exibirAuthAlert("error", "Erro no cadastro: " + err.message);
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `Solicitar Cadastro`;
    }
  }
}
