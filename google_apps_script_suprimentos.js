/**
 * Google Apps Script - Web App de Notificação de Demandas DFD
 * DESTINATÁRIO EXCLUSIVO: suprimentos.iad@ufjf.br
 * (Nenhum outro e-mail em cópia, nem Secretaria, nem Felipe, nem Josué, nem Xandó)
 * 
 * ============================================================================
 * COMO ATUALIZAR NO GOOGLE APPS SCRIPT (script.google.com):
 * ============================================================================
 * 1. Acesse https://script.google.com com sua conta @ufjf.br
 * 2. Abra o projeto do script de envio
 * 3. Substitua TODO o código do arquivo 'Code.gs' por este código abaixo
 * 4. Clique em "Implantar" (canto superior direito) > "Gerenciar implantações"
 * 5. Clique no ícone de lápis (Editar) na versão ativa:
 *    - Versão: selecione "Nova versão"
 *    - Executar como: "Eu (felipe.braga@ufjf.br)"
 *    - Quem pode acessar: "Qualquer pessoa"
 * 6. Clique no botão azul "Implantar"
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Sem dados recebidos." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var dados = JSON.parse(e.postData.contents);

    // DESTINATÁRIO EXCLUSIVO: Apenas suprimentos.iad@ufjf.br (sem CC, sem cópia para secretaria, felipe, josué ou xandó)
    var destinatario = "suprimentos.iad@ufjf.br";

    var emailDemandante = (dados.email || dados.remetente || "").trim();
    var nomeDemandante = (dados.nome || "Solicitante IAD").trim();
    var setorDemandante = (dados.setor || "Setor IAD").trim();
    var demandaId = dados.id ? (" #" + dados.id) : "";

    var assunto = "Solicitação de Demanda de Materiais" + demandaId + " — IAD/UFJF";
    var corpoTexto = dados.corpoTexto || "Demanda cadastrada no Sistema DFD.";
    var corpoHtml = dados.corpoHtml || gerarHtmlEmail(dados);

    // Opções de envio: APENAS o destinatário principal, SEM CC e SEM BCC
    var options = {
      name: nomeDemandante + " via Sistema DFD",
      replyTo: emailDemandante || destinatario,
      htmlBody: corpoHtml
    };

    // Envio exclusivo para suprimentos.iad@ufjf.br
    GmailApp.sendEmail(destinatario, assunto, corpoTexto, options);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      destinatario: destinatario,
      replyTo: emailDemandante
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Gerador do formato de texto e tabela limpo que o usuário aprovou
function gerarHtmlEmail(dados) {
  var itens = dados.itens || [];
  var totalGeral = dados.totalGeral || "R$ 0,00";

  var html = '<div style="font-family: Arial, Helvetica, sans-serif; max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px 28px; color: #1f2937;">';
  html += '<h2 style="color: #1e40af; font-size: 19px; font-weight: 700; margin: 0 0 10px 0;">Solicitação de Demanda de Materiais — IAD/UFJF</h2>';
  html += '<div style="height: 2px; background-color: #1e40af; margin-bottom: 20px;"></div>';

  html += '<p style="margin: 6px 0; font-size: 13.5px;"><strong>Solicitante:</strong> ' + (dados.nome || '-') + '</p>';
  html += '<p style="margin: 6px 0; font-size: 13.5px;"><strong>Setor / Departamento:</strong> ' + (dados.setor || '-') + '</p>';
  html += '<p style="margin: 6px 0; font-size: 13.5px;"><strong>SIAPE:</strong> ' + (dados.siape || '-') + '</p>';
  html += '<p style="margin: 6px 0; font-size: 13.5px;"><strong>E-mail Institucional:</strong> <a href="mailto:' + (dados.email || '') + '" style="color: #2563eb; text-decoration: underline;">' + (dados.email || '-') + '</a></p>';
  html += '<p style="margin: 6px 0; font-size: 13.5px;"><strong>Categoria:</strong> ' + (dados.categoria || 'Consumo') + '</p>';
  html += '<p style="margin: 6px 0; font-size: 13.5px;"><strong>Justificativa Geral:</strong> ' + (dados.justificativa || 'Não informada') + '</p>';

  html += '<p style="margin: 22px 0 10px 0; font-size: 14px; font-weight: 700; color: #111827;">Materiais Demandados:</p>';

  html += '<table style="width: 100%; border-collapse: collapse; font-size: 12.5px; text-align: left; margin-bottom: 20px;">';
  html += '<thead><tr style="border-bottom: 2px solid #e5e7eb; color: #374151;">';
  html += '<th style="padding: 8px 6px; text-align: center; width: 30px;">#</th>';
  html += '<th style="padding: 8px 6px; width: 75px;">Código</th>';
  html += '<th style="padding: 8px 6px;">Descrição</th>';
  html += '<th style="padding: 8px 6px; text-align: center; width: 85px;">Prioridade</th>';
  html += '<th style="padding: 8px 6px; text-align: center; width: 75px;">Qtd</th>';
  html += '<th style="padding: 8px 6px; text-align: right; width: 95px;">Preço Médio</th>';
  html += '<th style="padding: 8px 6px; text-align: right; width: 95px;">Total</th>';
  html += '</tr></thead><tbody>';

  for (var i = 0; i < itens.length; i++) {
    var it = itens[i];
    var qtd = it.quantidade || 1;
    var un = it.unidade || it.unidade_medida || 'UN';
    var vUnit = it.valor_unitario !== undefined ? it.valor_unitario : (it.valor_unitario_estimado || 0);
    var vTot = it.valor_total !== undefined ? it.valor_total : (qtd * vUnit);

    html += '<tr style="border-bottom: 1px solid #f3f4f6;">';
    html += '<td style="padding: 9px 6px; text-align: center; color: #6b7280;">' + (i + 1) + '</td>';
    html += '<td style="padding: 9px 6px; font-family: monospace;">' + (it.codigo || '-') + '</td>';
    html += '<td style="padding: 9px 6px; font-weight: 600; color: #111827;">' + (it.descricao || 'Item') + '</td>';
    html += '<td style="padding: 9px 6px; text-align: center;">' + (it.prioridade || 'Média') + '</td>';
    html += '<td style="padding: 9px 6px; text-align: center; font-weight: 600;">' + qtd + ' ' + un + '</td>';
    html += '<td style="padding: 9px 6px; text-align: right; color: #4b5563;">R$ ' + Number(vUnit).toFixed(2).replace('.', ',') + '</td>';
    html += '<td style="padding: 9px 6px; text-align: right; font-weight: 700; color: #1e40af;">R$ ' + Number(vTot).toFixed(2).replace('.', ',') + '</td>';
    html += '</tr>';
  }

  html += '</tbody></table>';

  html += '<div style="text-align: right; margin-top: 15px; font-size: 14px; color: #111827;">';
  html += '<strong>Estimativa Total da Demanda: </strong>';
  html += '<span style="font-size: 17px; font-weight: 800; color: #1e40af; margin-left: 6px;">' + totalGeral + '</span>';
  html += '</div>';

  html += '</div>';
  return html;
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    servico: "Sistema DFD IAD/UFJF",
    destinatario: "suprimentos.iad@ufjf.br"
  })).setMimeType(ContentService.MimeType.JSON);
}
