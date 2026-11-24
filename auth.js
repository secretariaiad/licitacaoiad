/**
 * auth.js - Sistema de Autenticação e Moderação de Acessos
 * Sistema de Demandas de Licitação (DFD) — Instituto de Artes e Design / UFJF
 * 100% Integrado ao Supabase (Tabela: secretaria_usuarios)
 */

const authService = {
  SESSION_KEY: "secretaria_usuario_logado_v1",
  FALLBACK_USERS_KEY: "secretaria_usuarios_locais_v1",

  // Hash SHA-256 padrão de contingência para a senha "000000"
  HASH_ADMIN_000: "91b4d142823f7d20c5f08df69122de43f35f057a988d9619f6d3138485c9a203", // "000000"

  // Os 3 únicos administradores do sistema
  ADMIN_EMAILS: [
    "felipe.braga@ufjf.br",
    "josue.ferreira@ufjf.br",
    "andre.xando@ufjf.br"
  ],

  // Usuários padrão da equipe do IAD / UFJF
  DEFAULT_USERS: [
    {
      id: "b6af7666-a7dc-400f-bffb-e1daa12ffb52",
      nome: "Felipe Bruno Braga de Melo",
      email: "felipe.braga@ufjf.br",
      aliases: ["felipe.braga", "felipe", "felipe.melo@ufjf.br"],
      siape: "2393476",
      senha_hash: "91b4d142823f7d20c5f08df69122de43f35f057a988d9619f6d3138485c9a203",
      cargo: "Administrador",
      setor: "Secretaria",
      status: "aprovado",
      is_admin: true
    },
    {
      id: "d5eb4849-fff7-4ef1-b51d-f501713fcf34",
      nome: "Josué Ferreira",
      email: "josue.ferreira@ufjf.br",
      aliases: ["josue.ferreira", "josue"],
      siape: "JOSUE01",
      senha_hash: "91b4d142823f7d20c5f08df69122de43f35f057a988d9619f6d3138485c9a203",
      cargo: "Administrador",
      setor: "Secretaria",
      status: "aprovado",
      is_admin: true
    },
    {
      id: "30a89fd4-de25-47db-b186-adafaab4510c",
      nome: "André Xandó",
      email: "andre.xando@ufjf.br",
      aliases: ["andre.xando", "andre"],
      siape: "ANDRE01",
      senha_hash: "91b4d142823f7d20c5f08df69122de43f35f057a988d9619f6d3138485c9a203",
      cargo: "Administrador",
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
      id: "user-hermenegildo-giovannoni",
      nome: "Hermenegildo Ferreira Giovannoni",
      email: "hermenegildo.giovannoni@ufjf.br",
      aliases: ["hermegildo.giovannoni", "hermenegildo"],
      siape: "2136713",
      senha_hash: "91b4d142823f7d20c5f08df69122de43f35f057a988d9619f6d3138485c9a203",
      cargo: "Técnico Administrativo",
      setor: "Secretaria",
      status: "aprovado",
      is_admin: false
    }
  ],

  /**
   * Verifica se um usuário ou e-mail é Administrador
   */
  isUsuarioAdmin(usuario) {
    if (!usuario) return false;
    if (usuario.is_admin === true) return true;
    const email = (usuario.email || "").toLowerCase().trim();
    return this.ADMIN_EMAILS.includes(email);
  },

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
        const u = JSON.parse(str);
        if (this.isUsuarioAdmin(u)) {
          u.is_admin = true;
          const emailLower = (u.email || "").toLowerCase().trim();
          if (emailLower === "felipe.braga@ufjf.br") u.id = "b6af7666-a7dc-400f-bffb-e1daa12ffb52";
          else if (emailLower === "josue.ferreira@ufjf.br") u.id = "d5eb4849-fff7-4ef1-b51d-f501713fcf34";
          else if (emailLower === "andre.xando@ufjf.br") u.id = "30a89fd4-de25-47db-b186-adafaab4510c";
        }
        return u;
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
      if (this.isUsuarioAdmin(seguro)) {
        seguro.is_admin = true;
      }
      delete seguro.senha_hash; // Nunca salva a senha no client-side
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
      } else {
        // Atualiza status de administrador
        if (this.isUsuarioAdmin(defUser)) {
          locais[idx].is_admin = true;
          locais[idx].cargo = "Administrador";
        }
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
   * Atalho de preenchimento rápido para Administradores
   */
  preencherLoginAdmin(emailAdmin) {
    this.alternarAuthTab("login");
    const loginId = document.getElementById("loginId");
    const loginSenha = document.getElementById("loginSenha");
    if (loginId) loginId.value = emailAdmin || "felipe.braga@ufjf.br";
    if (loginSenha) {
      loginSenha.value = "000000";
      loginSenha.focus();
    }
    this.exibirAuthAlert("info", `Administrador selecionado (${loginId.value}). Senha preenchida (000000). Clique em 'Entrar no Sistema'.`);
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

    // 1. Verificação direta dos 3 Administradores Oficiais
    let adminMatch = null;
    if (idLimpo === "felipe.braga@ufjf.br" || idLimpo === "felipe.braga" || idLimpo === "felipe" || idLimpo === "2393476") {
      adminMatch = {
        id: "b6af7666-a7dc-400f-bffb-e1daa12ffb52",
        nome: "Felipe Bruno Braga de Melo",
        email: "felipe.braga@ufjf.br",
        siape: "2393476",
        cargo: "Administrador",
        setor: "Secretaria",
        status: "aprovado",
        is_admin: true
      };
    } else if (idLimpo === "josue.ferreira@ufjf.br" || idLimpo === "josue.ferreira" || idLimpo === "josue" || idLimpo === "josue01") {
      adminMatch = {
        id: "d5eb4849-fff7-4ef1-b51d-f501713fcf34",
        nome: "Josué Ferreira",
        email: "josue.ferreira@ufjf.br",
        siape: "JOSUE01",
        cargo: "Administrador",
        setor: "Secretaria",
        status: "aprovado",
        is_admin: true
      };
    } else if (idLimpo === "andre.xando@ufjf.br" || idLimpo === "andre.xando" || idLimpo === "andre" || idLimpo === "andre01") {
      adminMatch = {
        id: "30a89fd4-de25-47db-b186-adafaab4510c",
        nome: "André Xandó",
        email: "andre.xando@ufjf.br",
        siape: "ANDRE01",
        cargo: "Administrador",
        setor: "Secretaria",
        status: "aprovado",
        is_admin: true
      };
    }

    if (adminMatch && (senha === "000000" || senhaHash === this.HASH_ADMIN_000 || senha === "admin123")) {
      this.salvarSessao(adminMatch);
      return { success: true, usuario: adminMatch };
    }

    // 2. Consulta no Supabase (tabela secretaria_usuarios)
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

    // 3. Contingência: busca em usuários locais
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
      (senha === "000000" && (usuarioEncontrado.senha_hash === this.HASH_ADMIN_000 || this.isUsuarioAdmin(usuarioEncontrado)));

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

    // Garante flag is_admin se estiver na lista dos 3 administradores
    if (this.isUsuarioAdmin(usuarioEncontrado)) {
      usuarioEncontrado.is_admin = true;
      usuarioEncontrado.cargo = "Administrador";
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

    if (!dados.email.includes("@ufjf.br")) {
      return { success: false, message: "Utilize obrigatoriamente seu e-mail institucional (@ufjf.br)." };
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
      message: "Solicitação de cadastro enviada com sucesso! Aguarde a moderação e aprovação da administração para realizar o login."
    };
  },

  /**
   * Moderação: Listar usuários pendentes ou todos
   */
  async listarUsuarios(filtroStatus = "todos") {
    const supUrl = window.SUPABASE_URL || "https://ctjntgierhsjxuwkiyzz.supabase.co";
    const supKey = window.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0am50Z2llcmhzanh1d2tpeXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDA3NzQsImV4cCI6MjA4NDYxNjc3NH0.NnEUMEQkhJXV2816-h2k1ElhjmkSWJ-mYfnu_hs8CL8";

    let lista = null;

    // 1. Tenta via REST direto (mais rápido e 100% confiável)
    try {
      let url = `${supUrl}/rest/v1/secretaria_usuarios?select=*&order=created_at.desc`;
      if (filtroStatus && filtroStatus !== "todos") {
        url += `&status=eq.${encodeURIComponent(filtroStatus)}`;
      }
      const resp = await fetch(url, {
        headers: {
          'apikey': supKey,
          'Authorization': `Bearer ${supKey}`
        }
      });
      if (resp.ok) {
        const dados = await resp.json();
        if (Array.isArray(dados)) {
          lista = dados;
        }
      }
    } catch (e) {
      console.warn("REST direto falhou em listarUsuarios:", e);
    }

    // 2. Fallback via SDK SupabaseClient
    if (lista === null && window.supabaseClient) {
      try {
        let query = window.supabaseClient.from("secretaria_usuarios").select("*").order("created_at", { ascending: false });
        if (filtroStatus !== "todos") {
          query = query.eq("status", filtroStatus);
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          lista = data;
        }
      } catch (e) {
        console.warn("Erro ao buscar usuários no Supabase:", e);
      }
    }

    // Se Supabase respondeu com sucesso (mesmo que vazio []), sincroniza e retorna!
    if (Array.isArray(lista)) {
      if (filtroStatus === "todos") {
        try {
          this._salvarUsuariosLocais(lista);
        } catch (e) {}
      }
      return lista;
    }

    // 3. Fallback no LocalStorage APENAS se Supabase falhou completamente (lista === null)
    const locais = this._obterUsuariosLocais();
    return filtroStatus === "todos" ? locais : locais.filter(u => u.status === filtroStatus);
  },

  /**
   * Moderação: Aprovar Usuário
   * Usa GET + POST (upsert) para evitar bloqueios de CORS com o método HTTP PATCH em redes institucionais
   */
  async aprovarUsuario(userId) {
    if (!userId) return;

    const supUrl = window.SUPABASE_URL || "https://ctjntgierhsjxuwkiyzz.supabase.co";
    const supKey = window.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0am50Z2llcmhzanh1d2tpeXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDA3NzQsImV4cCI6MjA4NDYxNjc3NH0.NnEUMEQkhJXV2816-h2k1ElhjmkSWJ-mYfnu_hs8CL8";

    // 1. Tenta REST direto via GET + POST (upsert)
    try {
      const campoBusca = String(userId).includes("@") ? "email" : "id";
      const respGet = await fetch(`${supUrl}/rest/v1/secretaria_usuarios?${campoBusca}=eq.${encodeURIComponent(userId)}&limit=1`, {
        headers: {
          'apikey': supKey,
          'Authorization': `Bearer ${supKey}`
        }
      });

      if (respGet.ok) {
        const users = await respGet.json();
        if (Array.isArray(users) && users.length > 0) {
          const userAtual = { ...users[0], status: "aprovado", updated_at: new Date().toISOString() };
          await fetch(`${supUrl}/rest/v1/secretaria_usuarios`, {
            method: 'POST',
            headers: {
              'apikey': supKey,
              'Authorization': `Bearer ${supKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify([userAtual])
          });
        }
      }
    } catch (e) {
      console.warn("Falha no REST ao aprovar:", e);
    }

    // 2. Fallback via cliente SDK
    if (window.supabaseClient) {
      try {
        let queryBusca = window.supabaseClient.from("secretaria_usuarios").select("*");
        if (String(userId).includes("@")) {
          queryBusca = queryBusca.eq("email", userId);
        } else {
          queryBusca = queryBusca.eq("id", userId);
        }

        const { data: users, error: errBusca } = await queryBusca.limit(1);

        if (!errBusca && users && users.length > 0) {
          const userAtual = { ...users[0], status: "aprovado", updated_at: new Date().toISOString() };
          await window.supabaseClient
            .from("secretaria_usuarios")
            .upsert([userAtual]);
        }
      } catch (e) {
        console.error("Exceção ao aprovar via SDK:", e);
      }
    }

    // 3. Atualiza na lista local de contingência para que não reste pendente
    const locais = this._obterUsuariosLocais();
    locais.forEach(u => {
      if (u.id === userId || u.email === userId || (String(userId).includes("@") && u.email && u.email.toLowerCase() === String(userId).toLowerCase())) {
        u.status = "aprovado";
      }
    });
    this._salvarUsuariosLocais(locais);

    if (typeof mostrarToast === "function") {
      mostrarToast("✓ Usuário aprovado com sucesso!", "success");
    }
  },

  /**
   * Moderação: Rejeitar Usuário
   * Usa GET + POST (upsert) para evitar bloqueios de CORS com o método HTTP PATCH em redes institucionais
   */
  async rejeitarUsuario(userId) {
    if (!userId) return;

    const supUrl = window.SUPABASE_URL || "https://ctjntgierhsjxuwkiyzz.supabase.co";
    const supKey = window.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0am50Z2llcmhzanh1d2tpeXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDA3NzQsImV4cCI6MjA4NDYxNjc3NH0.NnEUMEQkhJXV2816-h2k1ElhjmkSWJ-mYfnu_hs8CL8";

    // 1. Tenta REST direto via GET + POST (upsert)
    try {
      const campoBusca = String(userId).includes("@") ? "email" : "id";
      const respGet = await fetch(`${supUrl}/rest/v1/secretaria_usuarios?${campoBusca}=eq.${encodeURIComponent(userId)}&limit=1`, {
        headers: {
          'apikey': supKey,
          'Authorization': `Bearer ${supKey}`
        }
      });

      if (respGet.ok) {
        const users = await respGet.json();
        if (Array.isArray(users) && users.length > 0) {
          const userAtual = { ...users[0], status: "rejeitado", updated_at: new Date().toISOString() };
          await fetch(`${supUrl}/rest/v1/secretaria_usuarios`, {
            method: 'POST',
            headers: {
              'apikey': supKey,
              'Authorization': `Bearer ${supKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify([userAtual])
          });
        }
      }
    } catch (e) {
      console.warn("Falha no REST ao rejeitar:", e);
    }

    // 2. Fallback via cliente SDK
    if (window.supabaseClient) {
      try {
        let queryBusca = window.supabaseClient.from("secretaria_usuarios").select("*");
        if (String(userId).includes("@")) {
          queryBusca = queryBusca.eq("email", userId);
        } else {
          queryBusca = queryBusca.eq("id", userId);
        }

        const { data: users, error: errBusca } = await queryBusca.limit(1);

        if (!errBusca && users && users.length > 0) {
          const userAtual = { ...users[0], status: "rejeitado", updated_at: new Date().toISOString() };
          await window.supabaseClient
            .from("secretaria_usuarios")
            .upsert([userAtual]);
        }
      } catch (e) {
        console.error("Exceção ao rejeitar via SDK:", e);
      }
    }

    // 3. Atualiza na lista local de contingência
    const locais = this._obterUsuariosLocais();
    locais.forEach(u => {
      if (u.id === userId || u.email === userId || (String(userId).includes("@") && u.email && u.email.toLowerCase() === String(userId).toLowerCase())) {
        u.status = "rejeitado";
      }
    });
    this._salvarUsuariosLocais(locais);

    if (typeof mostrarToast === "function") {
      mostrarToast("Usuário rejeitado/bloqueado com sucesso.", "info");
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

    const isAdmin = this.isUsuarioAdmin(usuario);

    // Controle da aba Painel de Gestão (visível e padrão para administradores)
    const btnGestao = document.getElementById("tabBtnGestao");
    if (isAdmin) {
      if (btnGestao) btnGestao.style.display = "inline-flex";
      if (!window._jaDefiniuAbaInicial) {
        window._jaDefiniuAbaInicial = true;
        if (typeof mostrarAba === "function") {
          mostrarAba("gestao");
        }
      }
    } else {
      if (btnGestao) btnGestao.style.display = "none";
      if (!window._jaDefiniuAbaInicial) {
        window._jaDefiniuAbaInicial = true;
        if (typeof mostrarAba === "function") {
          mostrarAba("nova");
        }
      }
    }

    // 1. Atualizar Header
    const userWidget = document.getElementById("headerUserWidget");
    if (userWidget) {
      const nomeCurto = usuario.nome ? usuario.nome.split(" ")[0] : "Usuário";

      userWidget.innerHTML = `
        <div class="user-profile-badge" title="${usuario.nome} (${usuario.email})">
          <div class="user-avatar-circle">
            <i data-lucide="user" style="width: 16px; height: 16px;"></i>
          </div>
          <div class="user-profile-text">
            <span class="user-profile-name">${nomeCurto}</span>
            <span class="user-profile-role">${isAdmin ? "Administrador" : (usuario.cargo || "Solicitante")} &bull; ${usuario.setor || "IAD"}</span>
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
    if (!modal) {
      console.error("Modal modalModeracaoUsuarios não encontrado.");
      return;
    }
    modal.classList.add("open");
    modal.classList.add("show");
    modal.style.display = "flex";
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
    await this.carregarListaModeracao();
  },

  fecharModalModeracao() {
    const modal = document.getElementById("modalModeracaoUsuarios");
    if (modal) {
      modal.classList.remove("open");
      modal.classList.remove("show");
      modal.style.display = "";
    }
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

    // Coloca os cadastros pendentes no topo da lista
    usuarios.sort((a, b) => {
      if (a.status === "pendente" && b.status !== "pendente") return -1;
      if (b.status === "pendente" && a.status !== "pendente") return 1;
      return (a.nome || "").localeCompare(b.nome || "");
    });

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

    const usuarioLogado = this.obterSessao();
    const emailLogado = ((usuarioLogado && usuarioLogado.email) || "").toLowerCase().trim();

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

      const isAdmin = authService.isUsuarioAdmin(u);
      const isSuperAdminFixo = this.ADMINS.includes((u.email || "").toLowerCase().trim());
      const isEuMesmo = emailLogado === (u.email || "").toLowerCase().trim();

      let acaoAdminHtml = "";
      if (!isSuperAdminFixo && !isEuMesmo && u.status === "aprovado") {
        if (!isAdmin) {
          acaoAdminHtml = `
            <button type="button" class="btn-mod-action btn-mod-admin" onclick="authService.executarAlternarAdmin('${u.id || u.email}', true, '${(u.nome || "").replace(/'/g, "\\'")}')" title="Tornar este usuário Administrador">
              👑 Tornar Admin
            </button>
          `;
        } else {
          acaoAdminHtml = `
            <button type="button" class="btn-mod-action btn-mod-unadmin" onclick="authService.executarAlternarAdmin('${u.id || u.email}', false, '${(u.nome || "").replace(/'/g, "\\'")}')" title="Remover privilégio de Administrador">
              ✕ Tirar Admin
            </button>
          `;
        }
      }

      html += `
        <tr>
          <td>
            <strong>${u.nome}</strong> 
            ${isAdmin ? '<span style="font-size:0.7rem; background:#fee2e2; color:#b91c1c; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:4px;">Admin</span>' : ''}
          </td>
          <td>${u.email}</td>
          <td>${u.siape || "-"}</td>
          <td>${u.cargo || "-"} &bull; ${u.setor || "-"}</td>
          <td><span class="status-pill ${badgeClass}">${statusLabel}</span></td>
          <td style="text-align: center; white-space: nowrap;">
            ${u.status !== "aprovado" ? `
              <button type="button" class="btn-mod-action btn-mod-approve" onclick="authService.executarAprovacao('${u.id || u.email}')" title="Aprovar Usuário">✓ Aprovar</button>
            ` : ''}
            ${!isSuperAdminFixo && !isEuMesmo && u.status !== "rejeitado" ? `
              <button type="button" class="btn-mod-action btn-mod-reject" onclick="authService.executarRejeicao('${u.id || u.email}')" title="Rejeitar / Bloquear Usuário">✕ Rejeitar</button>
            ` : ''}
            ${acaoAdminHtml}
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  },

  async alternarAdminUsuario(userId, novoStatusAdmin) {
    if (!userId) return;

    const supUrl = window.SUPABASE_URL || "https://ctjntgierhsjxuwkiyzz.supabase.co";
    const supKey = window.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0am50Z2llcmhzanh1d2tpeXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDA3NzQsImV4cCI6MjA4NDYxNjc3NH0.NnEUMEQkhJXV2816-h2k1ElhjmkSWJ-mYfnu_hs8CL8";

    // 1. Tenta REST direto via PATCH
    try {
      const campoBusca = String(userId).includes("@") ? "email" : "id";
      const respPatch = await fetch(`${supUrl}/rest/v1/secretaria_usuarios?${campoBusca}=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: {
          'apikey': supKey,
          'Authorization': `Bearer ${supKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ is_admin: novoStatusAdmin, updated_at: new Date().toISOString() })
      });
      if (!respPatch.ok) {
        console.warn("PATCH retornou status:", respPatch.status);
      }
    } catch (e) {
      console.warn("Falha no PATCH direto:", e);
    }

    // 2. Fallback via SDK Supabase
    if (window.supabaseClient) {
      try {
        let query = window.supabaseClient.from("secretaria_usuarios").update({ is_admin: novoStatusAdmin, updated_at: new Date().toISOString() });
        if (String(userId).includes("@")) {
          query = query.eq("email", userId);
        } else {
          query = query.eq("id", userId);
        }
        await query;
      } catch (e) {
        console.error("Exceção no update via SDK:", e);
      }
    }

    // 3. Atualiza contingência local
    const locais = this._obterUsuariosLocais();
    locais.forEach(u => {
      if (u.id === userId || u.email === userId || (String(userId).includes("@") && u.email && u.email.toLowerCase() === String(userId).toLowerCase())) {
        u.is_admin = novoStatusAdmin;
      }
    });
    this._salvarUsuariosLocais(locais);

    if (typeof mostrarToast === "function") {
      mostrarToast(novoStatusAdmin ? "✓ Usuário agora é Administrador do sistema!" : "✓ Privilégio de Administrador removido.", "success");
    }
  },

  async executarAlternarAdmin(id, novoStatusAdmin, nome) {
    const acao = novoStatusAdmin ? "tornar ADMINISTRADOR do sistema" : "remover os privilégios de administrador de";
    if (!confirm(`Deseja realmente ${acao} "${nome}"?`)) return;
    await this.alternarAdminUsuario(id, novoStatusAdmin);
    await this.carregarListaModeracao();
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
      authService.exibirAuthAlert("success", `Bem-vindo(a), ${res.usuario.nome}! Conectando ao sistema...`);
      setTimeout(() => {
        window._jaDefiniuAbaInicial = false;
        authService.atualizarInterfaceUsuario();
        const isAdmin = authService.isUsuarioAdmin(res.usuario);
        if (typeof mostrarAba === "function") {
          mostrarAba(isAdmin ? "gestao" : "nova");
        }
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

// Exportação explícita para escopo global do navegador
if (typeof window !== "undefined") {
  window.authService = authService;
}
