# Sistema de Levantamento de Demandas para Licitação (DFD) — IAD / UFJF

Sistema web moderno e integrado para cadastro, planejamento e acompanhamento de demandas de materiais para o setor de compras e licitações do **Instituto de Artes e Design (IAD / UFJF)**.

Conta com **busca em tempo real (autocomplete)** sobre o catálogo oficial com mais de **37.000 itens**, **integração na nuvem via Supabase** e **sistema unificado de autenticação e moderação** padronizado com os outros sistemas do IAD (**Secretaria Virtual** e **PIT-RIT**).

---

## 🚀 Como Iniciar o Sistema

### Opção 1: Início Rápido no Windows
Basta dar um duplo clique no arquivo:
```
iniciar_sistema.bat
```
Ou executar no terminal (PowerShell / Prompt):
```bash
python app.py
```
O sistema abrirá automaticamente em `http://localhost:8080`.

### Opção 2: Direto no Navegador (Offline / GitHub Pages)
O sistema foi desenvolvido para funcionar tanto através do servidor Python local quanto 100% no navegador (inclusive via `file://` ou hospedado em GitHub Pages / Vercel), com persistência direta na nuvem via Supabase e contingência no LocalStorage.

---

## 🔐 Sistema de Login e Autenticação (Padrão IAD / UFJF)

O sistema conta com o mesmo mecanismo de autenticação seguro utilizado na **Secretaria Virtual** e no **PIT-RIT**:

1. **Credenciais Padrão Pré-configuradas**:
   - **Administrador**: `admin@iad.ufjf.br` | Senha: `admin123` (ou `000000`)
   - **Secretaria Geral**: `secretaria@iad.ufjf.br` | Senha: `000000` (ou `admin123`)
   - Há um atalho com 1 clique para "Acesso Administrador" na tela de login.

2. **Solicitação de Cadastro de Novos Docentes e Servidores**:
   - Qualquer professor, técnico ou bolsista pode solicitar cadastro na aba **📝 Solicitar Cadastro**.
   - **Moderação Obrigatória**: Novos cadastros entram com status `pendente` e podem ser aprovados ou rejeitados pelo Administrador no painel de moderação.

3. **Auto-preenchimento Inteligente do Solicitante**:
   - Ao fazer login, o sistema preenche automaticamente os campos do formulário:
     - **Nome do Solicitante**
     - **Matrícula SIAPE**
     - **E-mail Institucional (@ufjf.br)**
     - **Departamento ou Setor Solicitante**

4. **Gerenciamento de Sessão e Logout**:
   - Widget no cabeçalho exibindo nome, cargo/setor e nível de acesso.
   - Botão **Moderação** (com contador de cadastros pendentes para o Administrador).
   - Botão **Sair** (Logout) com confirmação.

---

## ☁️ Integração com Supabase (Nuvem em Tempo Real)

- **Projeto Supabase Unificado**: `https://ctjntgierhsjxuwkiyzz.supabase.co` (o mesmo da Secretaria Virtual do IAD).
- **Tabela de Usuários**: `secretaria_usuarios` (compartilhada entre os sistemas).
- **Tabela de Demandas (DFD)**: `demandas_dfd` (persistência em nuvem de todas as solicitações, histórico unificado e controle de status).
- **Controle de Status Administrativo**:
  - `Cadastrada`
  - `Em Análise` (Secretaria)
  - `Aprovada` (Direção)
  - `Encaminhada para Licitação`
  - `Finalizada / Atendida`
  - `Rejeitada / Devolvida`
- **Script SQL para o Banco de Dados**:
  - O arquivo `criar_tabela_demandas_dfd.sql` contém a estrutura completa para ser executada no SQL Editor do Supabase com índices, trigger de atualização e políticas RLS.

---

## 🎯 Principais Recursos do Formulário e Catálogo

1. **Catálogo Oficial com Mais de 37.000 Itens**:
   - Autocomplete dinâmico e inteligente por código CATMAT, descrição ou subelemento.
   - Puxa automaticamente código, unidade de medida, elemento de despesa e subelemento oficial.

2. **Cesta de Materiais Demandados**:
   - Inclusão de múltiplos itens por requisição.
   - Definição de prioridade (Alta, Média, Baixa), quantidade, preço médio estimado, links de referência e especificações técnicas.
   - Cálculo automático do custo total estimado da demanda.

3. **Envio e Exportação**:
   - Envio automático por e-mail pelo endereço institucional cadastrado do próprio demandante exclusivamente para o setor de suprimentos (`suprimentos.iad@ufjf.br`).
   - Modal de visualização com formatação para impressão e geração de relatórios / DFD oficial.

---

## 📂 Arquivos do Sistema

- `index.html`: Interface visual responsiva, com tela de login, auto-preenchimento, moderação e catálogo.
- `auth.js`: Módulo de autenticação, criptografia SHA-256 e moderação de usuários.
- `supabase-config.js`: Configuração e conexão com o projeto Supabase da Secretaria Virtual.
- `demandas-supabase.js`: Serviços de sincronização e persistência de demandas no Supabase.
- `criar_tabela_demandas_dfd.sql`: Script SQL para criação da tabela `demandas_dfd` no painel Supabase.
- `itens_catalogo.js` / `itens_catalogo.json`: Catálogo oficial de materiais integrados.
- `app.py`: Servidor HTTP Python com entrega de arquivos estáticos e suporte a APIs locais.
- `database.py`: Motor de dados local SQLite FTS5 (busca de alta performance).
- `iniciar_sistema.bat`: Inicializador em 1 clique para ambiente Windows.
