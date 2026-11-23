/**
 * Google Apps Script - Web App de Notificação e Registro de Demandas DFD
 * Destinatário Exclusivo: suprimentos.iad@ufjf.br (Conta Delegada do IAD)
 * 
 * ============================================================================
 * INSTRUÇÕES DE IMPLANTAÇÃO NO GOOGLE APPS SCRIPT (script.google.com):
 * ============================================================================
 * 1. Acesse https://script.google.com com sua conta institucional (@ufjf.br).
 * 2. Crie ou abra o projeto do Web App de Demandas.
 * 3. Substitua o conteúdo do arquivo 'Code.gs' por este código.
 * 4. Clique no botão azul "Implantar" > "Gerenciar implantações".
 * 5. Clique no ícone de lápis (Editar) na versão ativa:
 *    - Versão: "Nova versão"
 *    - Executar como: "Eu (felipe.braga@ufjf.br)"
 *    - Quem pode acessar: "Qualquer pessoa" (permite que a página GitHub Pages envie requisições)
 * 6. Clique em "Implantar" e confirme as permissões do Google Workspace se solicitado.
 * 
 * VANTAGENS:
 * - Quem recebe o e-mail: Exclusivamente suprimentos.iad@ufjf.br
 * - Reply-To (Responder para): Configurado automaticamente para o e-mail cadastrado
 *   do demandante (ex: jacqueline.roque@ufjf.br). Ao clicar em "Responder" no Gmail,
 *   a mensagem vai diretamente para quem fez a solicitação!
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Nenhum dado recebido no POST."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var dados = JSON.parse(e.postData.contents);

    // Destinatário Oficial e Exclusivo (Conta Delegada IAD)
    var destinatario = "suprimentos.iad@ufjf.br";

    // Dados do Demandante Requisitante
    var emailDemandante = (dados.email || dados.remetente || "").trim();
    var nomeDemandante = (dados.nome || "Solicitante IAD").trim();
    var setorDemandante = (dados.setor || "Setor IAD").trim();
    var siape = (dados.siape || "-").trim();
    var totalGeral = (dados.totalGeral || "R$ 0,00").trim();
    var demandaId = dados.id ? (" #" + dados.id) : "";

    var assunto = "Solicitação de Demanda de Materiais" + demandaId + " - " + setorDemandante + " (" + nomeDemandante + ")";
    var corpo = dados.corpoTexto || "Demanda cadastrada no Sistema DFD do IAD.";

    // Disparo oficial para suprimentos.iad@ufjf.br
    // Com replyTo configurado para o demandante
    GmailApp.sendEmail(destinatario, assunto, corpo, {
      name: nomeDemandante + " (Demandante IAD)",
      replyTo: emailDemandante || destinatario
    });

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      destinatario: destinatario,
      replyTo: emailDemandante,
      assunto: assunto
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    servico: "Sistema DFD IAD/UFJF",
    destinatario: "suprimentos.iad@ufjf.br"
  })).setMimeType(ContentService.MimeType.JSON);
}
