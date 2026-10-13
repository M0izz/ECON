"""
Lightweight production HTTP server for the agent_ecosystem microservice.
Binds to $PORT (default 8000) and exposes /health and /status endpoints for cloud
platforms (Render, Railway, Fly.io, Heroku) so web service health checks pass cleanly.
"""
import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

class AgentEcosystemHandler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path in ("/health", "/healthz", "/"):
            self._send_json(200, {
                "status": "online",
                "service": "agent_ecosystem",
                "agents": ["scout", "analyst", "executor"],
                "network": "eip155:10143",
                "vault": os.getenv("CREDIT_VAULT_ADDRESS", "not_configured")
            })
        elif self.path == "/status":
            self._send_json(200, {
                "status": "ready",
                "simulation": not bool(os.getenv("SCOUT_PRIVATE_KEY"))
            })
        else:
            self._send_json(404, {"error": "Not found"})

    def log_message(self, format, *args):
        # Clean logging
        print(f"[agent_ecosystem] {self.address_string()} - {format % args}")

def run_server():
    port = int(os.environ.get("PORT", "8000"))
    server_address = ("0.0.0.0", port)
    httpd = HTTPServer(server_address, AgentEcosystemHandler)
    print(f"[agent_ecosystem] Server listening on 0.0.0.0:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("[agent_ecosystem] Shutting down...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
