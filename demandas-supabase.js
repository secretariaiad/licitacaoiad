/**
 * demandas-supabase.js - Camada de Integração de Demandas de Licitação com Supabase
 * Tabela Oficial: demandas_dfd (Persistência em Nuvem Compartilhada em Tempo Real)
 */

const demandasSupabase = {
  TABELA: "demandas_dfd",

  /**
   * Salva ou atualiza uma demanda no Supabase
   */
  async salvarDemanda(dados, idExistente = null) {
    const usuarioLogado = typeof authService !== "undefined" ? authService.obterSessao() : null;
    const totalDemanda = dados.itens.reduce((acc, it) => acc + (Number(it.quantidade || 0) * Number(it.valor_unitario || 0)), 0);

    // Valida se usuario_id é um UUID válido (36 chars com hífens)
    let validUserId = null;
    if (usuarioLogado?.id && typeof usuarioLogado.id === 'string' && usuarioLogado.id.length === 36 && usuarioLogado.id.includes('-')) {
      validUserId = usuarioLogado.id;
    }

    const payload = {
      nome_solicitante: dados.solicitante.nome,
      setor_solicitante: dados.solicitante.setor,
      siape: dados.solicitante.siape,
      email: dados.solicitante.email,
      categoria: dados.solicitante.categoria || 'Consumo',
      justificativa: dados.solicitante.justificativa,
      status: 'Cadastrada',
      total_itens: dados.itens.length,
      estimativa_total: totalDemanda,
      itens: dados.itens.map(it => ({
        id_item: it.id_item || null,
        codigo: it.codigo,
        descricao: it.descricao,
        elemento: it.elemento,
        desc_elemento: it.desc_elemento,
        subelemento: it.subelemento,
        desc_subelemento: it.desc_subelemento,
        unidade: it.unidade,
        quantidade: Math.max(1, Math.floor(Number(it.quantidade || 1))),
        valor_unitario: Number(it.valor_unitario || 0),
        valor_total: Math.max(1, Math.floor(Number(it.quantidade || 1))) * Number(it.valor_unitario || 0),
        prioridade: it.prioridade || 'Média',
        links: it.links || '',
        justificativa: it.justificativa || '',
        especificacoes: it.especificacoes || it.observacoes || ''
      })),
      usuario_id: validUserId,
      updated_at: new Date().toISOString()
    };

    const supUrl = window.SUPABASE_URL || "https://ctjntgierhsjxuwkiyzz.supabase.co";
    const supKey = window.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0am50Z2llcmhzanh1d2tpeXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDA3NzQsImV4cCI6MjA4NDYxNjc3NH0.NnEUMEQkhJXV2816-h2k1ElhjmkSWJ-mYfnu_hs8CL8";

    // 1. Tenta salvar via REST API direta nativa (livre de bloqueios de SDK ou sessão)
    try {
      const payloadEnvio = { ...payload };
      if (idExistente && !isNaN(Number(idExistente))) {
        payloadEnvio.id = Number(idExistente);
      } else {
        payloadEnvio.created_at = new Date().toISOString();
      }

      const resp = await fetch(`${supUrl}/rest/v1/${this.TABELA}`, {
        method: 'POST',
        headers: {
          'apikey': supKey,
          'Authorization': `Bearer ${supKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify([payloadEnvio])
      });

      if (resp.ok) {
        const resJson = await resp.json();
        if (Array.isArray(resJson) && resJson.length > 0) {
          return { sucesso: true, id: resJson[0].id, data: resJson[0] };
        }
      } else {
        const errTxt = await resp.text();
        console.warn("REST direto retornou erro ao salvar:", resp.status, errTxt);
      }
    } catch (e) {
      console.warn("Falha no REST direto ao salvar demanda:", e);
    }

    // 2. Fallback via SDK SupabaseClient
    try {
      if (idExistente && !isNaN(Number(idExistente))) {
        // Atualizar demanda existente no Supabase via upsert (POST)
        payload.id = Number(idExistente);
        const { data, error } = await window.supabaseClient
          .from(this.TABELA)
          .upsert([payload])
          .select();

        if (error) {
          console.warn("Aviso no upsert via ID, tentando inserção alternativa:", error);
          delete payload.id;
          payload.created_at = new Date().toISOString();
          const { data: dataIns, error: errIns } = await window.supabaseClient
            .from(this.TABELA)
            .insert([payload])
            .select();
          if (errIns) {
            console.error("Erro na inserção alternativa:", errIns);
            return { sucesso: false, erro: errIns.message };
          }
          const rec = dataIns && dataIns.length > 0 ? dataIns[0] : null;
          return { sucesso: true, id: rec?.id || null, data: rec };
        }
        return { sucesso: true, id: payload.id, data: data ? data[0] : null, atualizado: true };
      } else {
        // Inserir nova demanda no Supabase (POST)
        payload.created_at = new Date().toISOString();

        const { data, error } = await window.supabaseClient
          .from(this.TABELA)
          .insert([payload])
          .select();

        if (error) {
          console.error("Erro ao inserir no Supabase:", error);
          return { sucesso: false, erro: error.message };
        }
        const novoRegistro = data && data.length > 0 ? data[0] : null;
        return { sucesso: true, id: novoRegistro?.id || null, data: novoRegistro };
      }
    } catch (err) {
      console.error("Exceção ao salvar demanda no Supabase:", err);
      return { sucesso: false, erro: err.message };
    }
  },

  /**
   * Lista demandas salvas no Supabase
   */
  async listarDemandas(filtroStatus = "todos") {
    const supUrl = window.SUPABASE_URL || "https://ctjntgierhsjxuwkiyzz.supabase.co";
    const supKey = window.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0am50Z2llcmhzanh1d2tpeXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDA3NzQsImV4cCI6MjA4NDYxNjc3NH0.NnEUMEQkhJXV2816-h2k1ElhjmkSWJ-mYfnu_hs8CL8";

    // 1. Tenta via REST API direta nativa (livre de estado de sessão, mais rápida e 100% confiável)
    try {
      let url = `${supUrl}/rest/v1/${this.TABELA}?select=*&order=created_at.desc`;
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
          return dados;
        }
      } else {
        console.warn("REST direto retornou erro ao listar:", resp.status);
      }
    } catch (e) {
      console.warn("REST direto falhou, tentando cliente Supabase:", e);
    }

    // 2. Fallback via SDK SupabaseClient
    if (window.supabaseClient) {
      try {
        let query = window.supabaseClient
          .from(this.TABELA)
          .select("*")
          .order("created_at", { ascending: false });

        if (filtroStatus && filtroStatus !== "todos") {
          query = query.eq("status", filtroStatus);
        }

        const { data, error } = await query;
        if (!error && data) return data;
      } catch (err) {
        console.error("Exceção ao listar demandas do Supabase:", err);
      }
    }

    return null;
  },

  /**
   * Atualiza o status de uma demanda (Painel da Secretaria / Administração)
   */
  async atualizarStatus(id, novoStatus, observacoesAdmin = "") {
    if (!window.supabaseClient) return false;

    try {
      // 1. Tenta obter o registro existente e fazer upsert (POST) livre de CORS PATCH
      const { data: reg, error: errGet } = await window.supabaseClient
        .from(this.TABELA)
        .select("*")
        .eq("id", id)
        .limit(1);

      if (!errGet && reg && reg.length > 0) {
        const atualizado = {
          ...reg[0],
          status: novoStatus,
          updated_at: new Date().toISOString()
        };
        if (observacoesAdmin !== null && observacoesAdmin !== undefined) {
          atualizado.observacoes_admin = observacoesAdmin;
        }

        const { error: errUpsert } = await window.supabaseClient
          .from(this.TABELA)
          .upsert([atualizado]);

        if (!errUpsert) return true;
      }

      // 2. Fallback via update
      const updatePayload = {
        status: novoStatus,
        updated_at: new Date().toISOString()
      };
      if (observacoesAdmin !== null && observacoesAdmin !== undefined) {
        updatePayload.observacoes_admin = observacoesAdmin;
      }

      const { error } = await window.supabaseClient
        .from(this.TABELA)
        .update(updatePayload)
        .eq("id", id);

      if (error) {
        console.error("Erro ao atualizar status:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Erro ao atualizar status da demanda:", err);
      return false;
    }
  },

  /**
   * Exclui uma demanda no Supabase
   */
  async excluirDemanda(id) {
    if (!window.supabaseClient) return false;

    try {
      const { error } = await window.supabaseClient
        .from(this.TABELA)
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Erro ao excluir demanda do Supabase:", err);
      return false;
    }
  },

  /**
   * Sincroniza demandas antigas salvas localmente para a nuvem
   */
  async sincronizarDemandasLocaisParaNuvem() {
    if (!window.supabaseClient) return;

    try {
      const localStr = localStorage.getItem("solicitacoes_iad");
      if (!localStr) return;
      const locais = JSON.parse(localStr);
      if (!Array.isArray(locais) || locais.length === 0) return;

      // Busca IDs existentes no Supabase
      const existentes = await this.listarDemandas();
      if (existentes === null) return; // Supabase offline, não faz nada

      let sincronizadas = 0;
      for (const loc of locais) {
        // Se a demanda local tem justificativa e itens, mas não está no Supabase
        const jaExiste = existentes.some(e => 
          (e.nome_solicitante === loc.nome_solicitante && e.siape === loc.siape && e.justificativa === loc.justificativa)
        );

        if (!jaExiste && loc.nome_solicitante && Array.isArray(loc.itens) && loc.itens.length > 0) {
          const dadosMigracao = {
            solicitante: {
              nome: loc.nome_solicitante,
              setor: loc.setor_solicitante,
              siape: loc.siape,
              email: loc.email,
              categoria: loc.categoria || "Consumo",
              justificativa: loc.justificativa || "Demanda migrada do armazenamento local"
            },
            itens: loc.itens.map(it => ({
              codigo: it.codigo,
              descricao: it.descricao,
              elemento: it.elemento,
              desc_elemento: it.desc_elemento,
              subelemento: it.subelemento,
              desc_subelemento: it.desc_subelemento,
              unidade: it.unidade,
              quantidade: it.quantidade,
              valor_unitario: it.valor_unitario || it.valor_unitario_estimado || 0,
              prioridade: it.prioridade || 'Média',
              links: it.links || '',
              justificativa: it.justificativa || '',
              especificacoes: it.especificacoes || it.observacoes || ''
            }))
          };
          const res = await this.salvarDemanda(dadosMigracao);
          if (res && res.sucesso) {
            sincronizadas++;
          }
        }
      }

      if (sincronizadas > 0) {
        console.log(`✓ ${sincronizadas} demandas locais foram sincronizadas com a nuvem (Supabase)!`);
        if (typeof mostrarToast === "function") {
          mostrarToast(`✓ ${sincronizadas} demandas que estavam salvas localmente foram sincronizadas com a nuvem!`, "success");
        }
      }
    } catch (e) {
      console.warn("Aviso na sincronização de demandas locais:", e);
    }
  }
};

// Exportação explícita para escopo global do navegador
if (typeof window !== "undefined") {
  window.demandasSupabase = demandasSupabase;
}
