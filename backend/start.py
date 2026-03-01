#!/usr/bin/env python3
"""
Entry point for crppr — optionally enables TLS with a self-signed certificate.

Environment variables
---------------------
CRPPR_TLS_ENABLED          "True" to serve over HTTPS (default: "False")
CRPPR_TLS_CERT_DIR         Directory for cert.pem / key.pem (default: "certs")
CRPPR_PORT                 Main application port (default: 8000)
CRPPR_HTTP_REDIRECT_PORT   HTTP listener that 301-redirects to HTTPS (default: 8080)
CRPPR_TLS_PORT             External HTTPS port used in redirect Location header (default: 443)
"""

import logging
import os
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

TLS_ENABLED = os.getenv("CRPPR_TLS_ENABLED", "false").lower() == "true"
CERT_DIR = Path(os.getenv("CRPPR_TLS_CERT_DIR", "certs"))
CERT_FILE = CERT_DIR / "cert.pem"
KEY_FILE = CERT_DIR / "key.pem"

HOST = "0.0.0.0"
PORT = int(os.getenv("CRPPR_PORT", "8000"))
HTTP_REDIRECT_PORT = int(os.getenv("CRPPR_HTTP_REDIRECT_PORT", "8080"))
TLS_PORT = int(os.getenv("CRPPR_TLS_PORT", "443"))

log = logging.getLogger("crppr.start")
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")


# ── Self-signed certificate generation ───────────────────────────────
def _generate_self_signed_cert():
    CERT_DIR.mkdir(parents=True, exist_ok=True)
    if CERT_FILE.exists() and KEY_FILE.exists():
        log.info("Using existing TLS certificate from %s", CERT_DIR)
        return
    log.info("Generating self-signed TLS certificate …")
    subprocess.run(
        [
            "openssl", "req", "-x509",
            "-newkey", "rsa:2048",
            "-keyout", str(KEY_FILE),
            "-out", str(CERT_FILE),
            "-days", "365",
            "-nodes",
            "-subj", "/CN=crppr",
        ],
        check=True,
    )
    log.info("Certificate written to %s", CERT_DIR)


# ── HTTP → HTTPS redirect server ────────────────────────────────────
class _RedirectHandler(BaseHTTPRequestHandler):
    """Responds to every request with a 301 redirect to the HTTPS equivalent."""

    def _redirect(self):
        host = (self.headers.get("Host") or "localhost").split(":")[0]
        port_suffix = "" if TLS_PORT == 443 else f":{TLS_PORT}"
        location = f"https://{host}{port_suffix}{self.path}"
        self.send_response(301)
        self.send_header("Location", location)
        self.end_headers()

    # Map every HTTP method to the redirect handler
    do_GET = do_POST = do_PUT = do_DELETE = do_PATCH = do_HEAD = do_OPTIONS = _redirect

    def log_message(self, fmt, *args):  # noqa: ARG002
        pass  # silence per-request logs


def _start_redirect_server():
    server = HTTPServer((HOST, HTTP_REDIRECT_PORT), _RedirectHandler)
    log.info(
        "HTTP → HTTPS redirect server listening on :%d (redirecting to port %d)",
        HTTP_REDIRECT_PORT,
        TLS_PORT,
    )
    server.serve_forever()


# ── Main ─────────────────────────────────────────────────────────────
def main():
    cmd = [
        sys.executable, "-m", "uvicorn",
        "backend.api.main:app",
        "--host", HOST,
        "--port", str(PORT),
    ]

    if TLS_ENABLED:
        _generate_self_signed_cert()
        cmd += ["--ssl-keyfile", str(KEY_FILE), "--ssl-certfile", str(CERT_FILE)]
        # Start the HTTP redirect server in a daemon thread
        threading.Thread(target=_start_redirect_server, daemon=True).start()
        log.info("Starting crppr with TLS on :%d", PORT)
    else:
        log.info("Starting crppr on :%d (TLS disabled)", PORT)

    os.execvp(cmd[0], cmd)


if __name__ == "__main__":
    main()
