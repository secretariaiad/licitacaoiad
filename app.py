"""
Servidor HTTP leve para o Sistema de Demandas de Licitação IAD/UFJF.
Fornece APIs REST para:
- Busca instantânea com autocomplete sobre os 37.331 itens de catálogo.
- Registro, listagem e detalhamento de solicitações de compras.
- Entrega do frontend web interativo e arquivos estáticos (JS, CSS, JSON).
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
import json
import urllib.parse
import os
import sys
import mimetypes
import webbrowser
import database

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class DemandaHandler(BaseHTTPRequestHandler):
    def end_headers_with_cors(self, content_type="application/json; charset=utf-8"):
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers_with_cors()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        # Rota de busca autocomplete: /api/buscar?q=...&limit=15
        if path == "/api/buscar":
            q = query.get("q", [""])[0]
            limit = int(query.get("limit", [15])[0])
            resultados = database.buscar_itens(q, limit=limit)
            
            resp_bytes = json.dumps(resultados, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.end_headers_with_cors()
            self.wfile.write(resp_bytes)
            return

        # Rota de listar solicitações: /api/solicitacoes
        if path == "/api/solicitacoes":
            solicitacoes = database.listar_solicitacoes()
            resp_bytes = json.dumps(solicitacoes, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.end_headers_with_cors()
            self.wfile.write(resp_bytes)
            return

        # Rota de detalhes de uma solicitação: /api/solicitacoes/<id>
        if path.startswith("/api/solicitacoes/"):
            try:
                sol_id = int(path.split("/")[-1])
                sol = database.obter_solicitacao_completa(sol_id)
                if sol:
                    resp_bytes = json.dumps(sol, ensure_ascii=False).encode("utf-8")
                    self.send_response(200)
                    self.end_headers_with_cors()
                    self.wfile.write(resp_bytes)
                else:
                    self.send_response(404)
                    self.end_headers_with_cors()
                    self.wfile.write(json.dumps({"erro": "Solicitacao nao encontrada"}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.end_headers_with_cors()
                self.wfile.write(json.dumps({"erro": str(e)}).encode("utf-8"))
            return

        # Servir arquivos estáticos do diretório BASE_DIR
        rel_path = path.lstrip("/")
        if not rel_path or rel_path == "index.html":
            file_name = "index.html"
        else:
            file_name = urllib.parse.unquote(rel_path)

        local_file = os.path.join(BASE_DIR, file_name)
        # Prevenção simples de path traversal
        if os.path.commonpath([BASE_DIR, os.path.abspath(local_file)]) == BASE_DIR and os.path.isfile(local_file):
            ext = os.path.splitext(local_file)[1].lower()
            mime_types = {
                ".html": "text/html; charset=utf-8",
                ".js": "application/javascript; charset=utf-8",
                ".json": "application/json; charset=utf-8",
                ".css": "text/css; charset=utf-8",
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".svg": "image/svg+xml",
                ".ico": "image/x-icon",
                ".sql": "text/plain; charset=utf-8",
                ".csv": "text/csv; charset=utf-8",
                ".pdf": "application/pdf"
            }
            content_type = mime_types.get(ext, "application/octet-stream")
            try:
                with open(local_file, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.end_headers_with_cors(content_type)
                self.wfile.write(content)
                return
            except Exception as err:
                self.send_response(500)
                self.end_headers_with_cors("text/plain")
                self.wfile.write(f"Erro ao ler arquivo: {err}".encode("utf-8"))
                return

        # Caso não encontre arquivo nem rota
        self.send_response(404)
        self.end_headers_with_cors()
        self.wfile.write(json.dumps({"erro": "Arquivo ou rota nao encontrada"}).encode("utf-8"))

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path == "/api/solicitacoes":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                dados = json.loads(body.decode("utf-8"))
                sol_id = database.salvar_solicitacao(dados)
                resposta = {"sucesso": True, "id": sol_id, "mensagem": "Solicitação salva com sucesso!"}
                self.send_response(201)
                self.end_headers_with_cors()
                self.wfile.write(json.dumps(resposta, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.end_headers_with_cors()
                self.wfile.write(json.dumps({"sucesso": False, "erro": str(e)}).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers_with_cors()

def run_server():
    # Inicializa banco de dados se necessário
    database.init_db()
    
    server_address = ('', PORT)
    httpd = ThreadedHTTPServer(server_address, DemandaHandler)
    url = f"http://localhost:{PORT}"
    print(f"\n=======================================================")
    print(f" Sistema de Demandas de Licitação (DFD) — IAD / UFJF")
    print(f" Supabase e Autenticação Ativos")
    print(f" Servidor iniciado com sucesso!")
    print(f" Acesse no navegador: {url}")
    print(f"=======================================================\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
