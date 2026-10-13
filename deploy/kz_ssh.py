#!/usr/bin/env python3
"""Run a command on the Kazakhstan VM (roomdo-v2-service-kz, 94.131.83.228) that hosts inapp.pro since 2026-10-11.

Port 22 on that VM is closed. This opens it for this Mac's current IPv4 only (a labelled rule in the VM's security
group), optionally copies files up, runs the command with stdin passed through, and always removes the rule again.

    python3 deploy/kz_ssh.py [--put LOCAL:REMOTE]... -- REMOTE COMMAND

Needs: `yc` logged in to the KZ cloud (endpoint api.yandexcloud.kz), and the VM's SSH key + pinned host key, which
live with the roomdo project (override with KZ_SSH_KEY / KZ_KNOWN_HOSTS).
"""
import argparse
import ipaddress
import json
import os
import pathlib
import subprocess
import sys
import time

HOST = "yc-user@94.131.83.228"
GROUP = "dbp1482eok07c0m905bm"
YC = ["yc", "--endpoint", "api.yandexcloud.kz:443", "vpc", "security-group"]
ROOMDO_PRIVATE = pathlib.Path.home() / "projects/app_01_roomdo/Branches/Server/deploy/private"
KEY = os.environ.get("KZ_SSH_KEY", str(ROOMDO_PRIVATE / "roomdo_deploy"))
KNOWN_HOSTS = os.environ.get("KZ_KNOWN_HOSTS", str(ROOMDO_PRIVATE / "kz_known_hosts"))
SSH_OPTS = ["-o", "BatchMode=yes", "-o", "ConnectTimeout=20", "-o", "IdentitiesOnly=yes",
            "-o", "StrictHostKeyChecking=yes", "-o", f"UserKnownHostsFile={KNOWN_HOSTS}",
            "-o", "ServerAliveInterval=30", "-i", KEY]


def run(args, timeout=90):
    result = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError(f"{' '.join(args[:4])}…: {result.stderr[-1500:]}")
    return result.stdout


def rules():
    return json.loads(run(YC + ["get", GROUP, "--format", "json"]))["rules"]


def my_ipv4():
    a = run(["curl", "-4", "-fsS", "--max-time", "15", "https://ifconfig.me/ip"]).strip()
    b = run(["curl", "-4", "-fsS", "--max-time", "15", "https://icanhazip.com"]).strip()
    if a != b:
        raise RuntimeError(f"public IP is ambiguous ({a} vs {b}); a VPN may be switching routes")
    return ipaddress.IPv4Address(a)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--put", action="append", default=[], metavar="LOCAL:REMOTE")
    parser.add_argument("command", nargs=argparse.REMAINDER)
    opts = parser.parse_args()
    command = opts.command[1:] if opts.command[:1] == ["--"] else opts.command
    if not command:
        parser.error("no remote command")

    label = f"inapp-deploy-{int(time.time())}"
    before = {r["id"] for r in rules()}
    ip = my_ipv4()
    code = 1
    try:
        run(YC + ["update-rules", GROUP, "--add-rule",
                  f"direction=ingress,protocol=tcp,port=22,v4-cidrs={ip}/32,description={label}", "--format", "json"])
        time.sleep(5)
        for spec in opts.put:
            local, remote = spec.split(":", 1)
            subprocess.run(["scp", "-q", *SSH_OPTS, local, f"{HOST}:{remote}"], check=True, timeout=600)
        code = subprocess.run(["ssh", *SSH_OPTS, HOST, *command]).returncode
    finally:
        for rule in rules():
            if rule.get("description") == label:
                run(YC + ["update-rules", GROUP, "--delete-rule-id", rule["id"], "--format", "json"])
        after = {r["id"] for r in rules()}
        if after != before:
            print(f"!! security group rules changed: added {after - before}, missing {before - after}", file=sys.stderr)
            code = code or 1
        else:
            print(">> temporary SSH rule removed", file=sys.stderr)
    sys.exit(code)


if __name__ == "__main__":
    main()
