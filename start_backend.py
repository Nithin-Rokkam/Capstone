import os
import re
import subprocess
import socket
import sys
from pathlib import Path


PORT = int(os.getenv("PORT", "8001"))
ROOT = Path(__file__).resolve().parent
PYTHON = ROOT / ".venv" / "Scripts" / "python.exe"


def _is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.25)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def _kill_port(port: int) -> None:
    try:
        output = subprocess.check_output(
            ["cmd", "/c", f'netstat -ano | findstr :{port}'],
            text=True,
            stderr=subprocess.DEVNULL,
        )
    except subprocess.CalledProcessError:
        return

    for line in output.splitlines():
        match = re.search(r"\s+(\d+)\s*$", line.strip())
        if not match:
            continue
        pid = match.group(1)
        subprocess.run(["taskkill", "/PID", pid, "/F"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return


def main() -> int:
    if _is_port_in_use(PORT):
        _kill_port(PORT)

    if not PYTHON.exists():
        print(f"Virtual environment Python not found: {PYTHON}", file=sys.stderr)
        return 1

    env = os.environ.copy()
    env["PORT"] = str(PORT)
    try:
        result = subprocess.run([str(PYTHON), "main.py"], cwd=ROOT, env=env)
        return result.returncode
    except KeyboardInterrupt:
        print("Backend stopped by user.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
