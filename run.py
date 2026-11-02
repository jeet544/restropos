#!/usr/bin/env python3
"""
RestroPOS — One-Click Development Server Runner
Runs locally on macOS, Linux, or Windows with Python 3.

Usage:
    python3 run.py
"""

import http.server
import socketserver
import os
import webbrowser
import sys

PORT = 3000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

class RestroPOSHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def log_message(self, format, *args):
        # Clean logging
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")

def start_server():
    os.chdir(FRONTEND_DIR)
    with socketserver.TCPServer(("", PORT), RestroPOSHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=" * 70)
        print("🍽️  RestroPOS — Restaurant Point of Sale System")
        print(f"🚀  Website running at: {url}")
        print("=" * 70)
        print("Press Ctrl+C to stop the server.\n")

        try:
            webbrowser.open(url)
        except Exception:
            pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down RestroPOS server. Good-bye!")
            sys.exit(0)

if __name__ == "__main__":
    start_server()
