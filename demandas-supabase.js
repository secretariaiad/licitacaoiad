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
    if (!window.supabaseClient) {
      return { sucesso: false, erro: "Conexão com o Supabase indisponível." };
    }

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
        quantidade: Number(it.quantidade || 1),
        valor_unitario: Number(it.valor_unitario || 0),
        valor_total: Number(it.quantidade || 1) * Number(it.valor_unitario || 0),
        prioridade: it.prioridade || 'Média',
        links: it.links || '',
        justificativa: it.justificativa || '',
        especificacoes: it.especificacoes || it.observacoes || ''
      })),
      usuario_id: validUserId,
      updated_at: new Date().toISOString()
    };

    try {
      if (idExistente) {
        // Atualizar demanda existente no Supabase
        const { data, error } = await window.supabaseClient
          .from(this.TABELA)
          .update(payload)
          .eq("id", idExistente)
          .select();

        if (error) {
          console.error("Erro ao atualizar no Supabase:", error);
          return { sucesso: false, erro: error.message };
        }
        return { sucesso: true, id: idExistente, data: data ? data[0] : null, atualizado: true };
      } else {
        // Inserir nova demanda no Supabase
        payload.status = 'Cadastrada';
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
    if (!window.supabaseClient) {
      console.warn("SupabaseClient não está disponível.");
      return null;
    }

    try {
      let query = window.supabaseClient
        .from(this.TABELA)
        .select("*")
        .order("created_at", { ascending: false });

      if (filtroStatus && filtroStatus !== "todos") {
        query = query.eq("status", filtroStatus);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Erro ao carregar demandas do Supabase:", error);
        return null;
      }
      return data || [];
    } catch (err) {
      console.error("Exceção ao listar demandas do Supabase:", err);
      return null;
    }
  },

  /**
   * Atualiza o status de uma demanda (Painel da Secretaria / Administração)
   */
  async atualizarStatus(id, novoStatus, observacoesAdmin = "") {
    if (!window.supabaseClient) return false;

    try {
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
