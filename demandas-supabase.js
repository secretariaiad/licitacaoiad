/**
 * demandas-supabase.js - Camada de Integração de Demandas de Licitação com Supabase
 * Suporta persistência em nuvem em tempo real com fallback automático para LocalStorage.
 */

const demandasSupabase = {
  TABELA: "demandas_dfd",

  /**
   * Salva ou atualiza uma demanda no Supabase
   */
  async salvarDemanda(dados, idExistente = null) {
    if (!window.supabaseClient) {
      console.warn("Supabase não disponível. Usando fallback local.");
      return null;
    }

    const usuarioLogado = authService ? authService.obterSessao() : null;
    const totalDemanda = dados.itens.reduce((acc, it) => acc + (it.quantidade * it.valor_unitario), 0);

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
        quantidade: it.quantidade,
        valor_unitario: it.valor_unitario,
        valor_total: it.quantidade * it.valor_unitario,
        prioridade: it.prioridade || 'Média',
        links: it.links || '',
        justificativa: it.justificativa || '',
        especificacoes: it.especificacoes || it.observacoes || ''
      })),
      usuario_id: usuarioLogado?.id && usuarioLogado.id.length === 36 ? usuarioLogado.id : null,
      updated_at: new Date().toISOString()
    };

    try {
      if (idExistente) {
        // Atualizar demanda existente
        const { data, error } = await window.supabaseClient
          .from(this.TABELA)
          .update(payload)
          .eq("id", idExistente)
          .select();

        if (error) throw error;
        return { sucesso: true, id: idExistente, data: data ? data[0] : null, atualizado: true };
      } else {
        // Inserir nova demanda
        payload.status = 'Cadastrada';
        payload.created_at = new Date().toISOString();

        const { data, error } = await window.supabaseClient
          .from(this.TABELA)
          .insert([payload])
          .select();

        if (error) throw error;
        const novoRegistro = data && data.length > 0 ? data[0] : null;
        return { sucesso: true, id: novoRegistro?.id || null, data: novoRegistro };
      }
    } catch (err) {
      console.warn("Erro ao salvar demanda no Supabase (verifique se a tabela 'demandas_dfd' foi criada):", err.message);
      return null;
    }
  },

  /**
   * Lista demandas salvas no Supabase
   */
  async listarDemandas(filtroStatus = "todos") {
    if (!window.supabaseClient) return null;

    try {
      let query = window.supabaseClient
        .from(this.TABELA)
        .select("*")
        .order("created_at", { ascending: false });

      if (filtroStatus && filtroStatus !== "todos") {
        query = query.eq("status", filtroStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn("Aviso ao carregar demandas do Supabase:", err.message);
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

      if (error) throw error;
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
  }
};
