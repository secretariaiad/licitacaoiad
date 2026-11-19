"""
Sistema de Solicitação de Compras de Materiais - Licitações IAD/UFJF
Banco de dados SQLite com FTS5 e persistência de requisições.
"""
import sqlite3
import csv
import os
import sys
import unicodedata
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "sistema_demandas.db")
CSV_PATH = os.path.join(os.path.dirname(__file__), "dados.csv")

def normalizar_texto(txt):
    if not txt:
        return ""
    txt = unicodedata.normalize('NFKD', txt)
    return "".join(c for c in txt if not unicodedata.combining(c)).upper()

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(force_rebuild=False):
    conn = get_connection()
    c = conn.cursor()
    
    # Criar tabelas se não existirem
    c.execute('''
        CREATE TABLE IF NOT EXISTS itens_catalogo (
            id_item TEXT,
            elemento TEXT,
            desc_elemento TEXT,
            subelemento TEXT,
            desc_subelemento TEXT,
            codigo TEXT,
            descricao TEXT,
            unidade TEXT,
            ativo TEXT,
            busca_normalizada TEXT
        )
    ''')
    
    c.execute('''
        CREATE VIRTUAL TABLE IF NOT EXISTS itens_fts USING fts5(
            descricao,
            codigo,
            id_item,
            desc_subelemento,
            desc_elemento,
            busca_normalizada,
            content=itens_catalogo,
            content_rowid=rowid
        )
    ''')
    
    # Tabela de solicitações
    c.execute('''
        CREATE TABLE IF NOT EXISTS solicitacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data_solicitacao TEXT,
            nome_solicitante TEXT,
            setor_solicitante TEXT,
            siape TEXT,
            email TEXT,
            categoria TEXT,
            data_limite TEXT,
            estimativa_total REAL DEFAULT 0,
            status TEXT DEFAULT 'Pendente'
        )
    ''')
    
    # Tabela de itens da solicitação
    c.execute('''
        CREATE TABLE IF NOT EXISTS itens_solicitados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            solicitacao_id INTEGER,
            item_catalogo_id TEXT,
            codigo TEXT,
            descricao TEXT,
            elemento TEXT,
            desc_elemento TEXT,
            subelemento TEXT,
            desc_subelemento TEXT,
            unidade TEXT,
            quantidade REAL,
            valor_unitario_estimado REAL DEFAULT 0,
            valor_total_estimado REAL DEFAULT 0,
            justificativa TEXT,
            observacoes TEXT,
            FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    
    # Verificar se catálogo já está populado
    c.execute('SELECT COUNT(*) FROM itens_catalogo')
    count = c.fetchone()[0]
    
    if count == 0 or force_rebuild:
        print(f"Indexando dados de {CSV_PATH} no banco SQLite...")
        c.execute('DELETE FROM itens_catalogo')
        c.execute('DROP TABLE IF EXISTS itens_fts')
        c.execute('''
            CREATE VIRTUAL TABLE itens_fts USING fts5(
                descricao,
                codigo,
                id_item,
                desc_subelemento,
                desc_elemento,
                busca_normalizada,
                content=itens_catalogo,
                content_rowid=rowid
            )
        ''')
        
        rows = []
        if os.path.exists(CSV_PATH):
            with open(CSV_PATH, 'r', encoding='utf-8', errors='replace') as f:
                reader = csv.reader(f, delimiter=';')
                header = next(reader, None)
                for r in reader:
                    if len(r) >= 9:
                        elem = r[0].strip()
                        desc_elem = r[1].strip()
                        subelem = r[2].strip()
                        desc_subelem = r[3].strip()
                        item_id = r[4].strip()
                        codigo = r[5].strip()
                        desc = r[6].strip()
                        unid = r[7].strip()
                        ativo = r[8].strip()
                        norm = f"{normalizar_texto(desc)} {normalizar_texto(codigo)} {normalizar_texto(desc_subelem)}"
                        rows.append((item_id, elem, desc_elem, subelem, desc_subelem, codigo, desc, unid, ativo, norm))
            
            c.executemany('''
                INSERT INTO itens_catalogo VALUES (?,?,?,?,?,?,?,?,?,?)
            ''', rows)
            c.execute("INSERT INTO itens_fts(itens_fts) VALUES ('rebuild')")
            conn.commit()
            print(f"Catálogo indexado com sucesso: {len(rows)} itens!")
        else:
            print("Aviso: dados.csv não encontrado no diretório.")
            
    conn.close()

def buscar_itens(query, limit=20):
    if not query or len(query.strip()) < 2:
        return []
    
    q_norm = normalizar_texto(query.strip())
    # FTS tokens
    tokens = [t.replace('"', '').replace("'", "") for t in q_norm.split() if t]
    if not tokens:
        return []
    
    # Construir consulta FTS com prefixo em cada termo
    fts_query = " ".join([f'"{tok}"*' for tok in tokens])
    
    conn = get_connection()
    c = conn.cursor()
    
    try:
        c.execute('''
            SELECT 
                i.rowid,
                i.id_item,
                i.elemento,
                i.desc_elemento,
                i.subelemento,
                i.desc_subelemento,
                i.codigo,
                i.descricao,
                i.unidade,
                i.ativo
            FROM itens_fts f
            JOIN itens_catalogo i ON f.rowid = i.rowid
            WHERE itens_fts MATCH ?
            ORDER BY rank
            LIMIT ?
        ''', (fts_query, limit))
        results = [dict(r) for r in c.fetchall()]
    except Exception as e:
        # Fallback para LIKE se a query FTS tiver caracteres inválidos
        like_pattern = f"%{query.strip()}%"
        c.execute('''
            SELECT 
                rowid,
                id_item,
                elemento,
                desc_elemento,
                subelemento,
                desc_subelemento,
                codigo,
                descricao,
                unidade,
                ativo
            FROM itens_catalogo
            WHERE descricao LIKE ? OR codigo LIKE ? OR desc_subelemento LIKE ?
            LIMIT ?
        ''', (like_pattern, like_pattern, like_pattern, limit))
        results = [dict(r) for r in c.fetchall()]
        
    conn.close()
    return results

def salvar_solicitacao(dados):
    """
    Salva uma nova solicitação com seus itens associados.
    """
    conn = get_connection()
    c = conn.cursor()
    
    sol = dados.get("solicitante", {})
    itens = dados.get("itens", [])
    
    total_geral = 0.0
    for it in itens:
        qtd = float(it.get("quantidade", 0) or 0)
        v_unit = float(it.get("valor_unitario", 0) or 0)
        total_geral += qtd * v_unit
        
    estimativa = float(sol.get("estimativa_total", 0) or total_geral)
    
    data_hora = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    c.execute('''
        INSERT INTO solicitacoes (
            data_solicitacao,
            nome_solicitante,
            setor_solicitante,
            siape,
            email,
            categoria,
            data_limite,
            estimativa_total,
            status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Registrada')
    ''', (
        data_hora,
        sol.get("nome", "").strip(),
        sol.get("setor", "").strip(),
        sol.get("siape", "").strip(),
        sol.get("email", "").strip(),
        sol.get("categoria", "").strip(),
        sol.get("data_limite", "").strip(),
        estimativa
    ))
    
    solicitacao_id = c.lastrowid
    
    for it in itens:
        qtd = float(it.get("quantidade", 0) or 0)
        v_unit = float(it.get("valor_unitario", 0) or 0)
        v_tot = qtd * v_unit
        c.execute('''
            INSERT INTO itens_solicitados (
                solicitacao_id,
                item_catalogo_id,
                codigo,
                descricao,
                elemento,
                desc_elemento,
                subelemento,
                desc_subelemento,
                unidade,
                quantidade,
                valor_unitario_estimado,
                valor_total_estimado,
                justificativa,
                observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            solicitacao_id,
            it.get("id_item", ""),
            it.get("codigo", ""),
            it.get("descricao", ""),
            it.get("elemento", ""),
            it.get("desc_elemento", ""),
            it.get("subelemento", ""),
            it.get("desc_subelemento", ""),
            it.get("unidade", ""),
            qtd,
            v_unit,
            v_tot,
            it.get("justificativa", ""),
            it.get("observacoes", "")
        ))
        
    conn.commit()
    conn.close()
    return solicitacao_id

def listar_solicitacoes():
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        SELECT s.*, count(i.id) as total_itens 
        FROM solicitacoes s
        LEFT JOIN itens_solicitados i ON s.id = i.solicitacao_id
        GROUP BY s.id
        ORDER BY s.id DESC
    ''')
    sols = [dict(r) for r in c.fetchall()]
    conn.close()
    return sols

def obter_solicitacao_completa(sol_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute('SELECT * FROM solicitacoes WHERE id = ?', (sol_id,))
    sol = c.fetchone()
    if not sol:
        conn.close()
        return None
    sol_dict = dict(sol)
    
    c.execute('SELECT * FROM itens_solicitados WHERE solicitacao_id = ?', (sol_id,))
    sol_dict["itens"] = [dict(r) for r in c.fetchall()]
    conn.close()
    return sol_dict

def excluir_solicitacao(sol_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute('DELETE FROM itens_solicitados WHERE solicitacao_id = ?', (sol_id,))
    c.execute('DELETE FROM solicitacoes WHERE id = ?', (sol_id,))
    conn.commit()
    conn.close()
    return True

if __name__ == "__main__":
    init_db()
