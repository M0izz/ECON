import json
import os
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path in ("/health", "/healthz", "/", "/api", "/api/health", "/api/index"):
            self._send_json(200, {
                "status": "online",
                "service": "agent_ecosystem",
                "agents": ["scout", "analyst", "executor"],
                "network": "eip155:10143",
                "vault": os.getenv("CREDIT_VAULT_ADDRESS", "not_configured")
            })
        elif path in ("/status", "/api/status"):
            self._send_json(200, {
                "status": "ready",
                "simulation": not bool(os.getenv("SCOUT_PRIVATE_KEY"))
            })
        else:
            self._send_json(404, {"error": "Not found", "path": path})

    def do_POST(self):
        self._send_json(200, {
            "status": "received",
            "service": "agent_ecosystem"
        })
