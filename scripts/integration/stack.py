#!/usr/bin/env python3
"""Docker-only disposable stack. Never consumes the shell/developer app environment."""

import argparse
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import signal
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
RUNS = ROOT / ".cache/integration"
DOCKER = ["docker", "--host", "unix:///var/run/docker.sock"]
PROJECT = re.compile(r"fitz_test_[0-9a-f]{12}\Z")
# Explicitly not inherited: DB URLs, CI validation bypass, email keys, Compose and
# Docker remote targets, NODE_OPTIONS, npm config, proxy settings and personal env.
ENV = {key: os.environ[key] for key in ("PATH", "HOME") if key in os.environ}
ENV["DOCKER_CONFIG"] = str(RUNS / ".docker-config")
LOG_ERRORS = []


def sanitized(value):
    value = re.sub(r"(postgres(?:ql)?://)[^@\s]+@", r"\1[redacted]@", value)
    value = re.sub(
        r"(?im)([\"']?(?:authorization|cookie|set-cookie)[\"']?\s*[:=]\s*)[^\r\n]+",
        r"\1[redacted]",
        value,
    )
    return re.sub(
        r"(?i)([\"']?[\w-]*(?:token|secret|password|api[_-]?key)[\"']?\s*[:=]\s*)"
        r"(?:\"[^\"]*\"|'[^']*'|[^\s,}]+)",
        r"\1[redacted]",
        value,
    )


def record(log, output):
    try:
        with log.open("a") as target:
            target.write(sanitized(output))
    except OSError as error:
        # Full/unwritable evidence storage cannot justify leaking live test data.
        LOG_ERRORS.append(str(log))
        print(sanitized(f"Could not save {log}: {error}"), file=sys.stderr)


def command(args, log, timeout=60, check=True):
    with subprocess.Popen(
        args,
        cwd=ROOT,
        env=ENV,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        errors="replace",
        start_new_session=True,
    ) as child:
        try:
            output, _ = child.communicate(timeout=timeout)
        except BaseException:
            os.killpg(child.pid, signal.SIGKILL)
            output, _ = child.communicate()
            record(log, output)
            raise
    record(log, output)
    if check and child.returncode:
        raise RuntimeError(f"Command failed ({child.returncode}); see {log}")
    return output, child.returncode


def compose(directory, *args):
    return DOCKER + [
        "compose",
        "--env-file",
        str(directory / "compose.env"),
        "--project-directory",
        str(directory),
        "-p",
        directory.name,
        "-f",
        str(directory / "compose.yaml"),
        *args,
    ]


def validate(directory):
    if directory.parent != RUNS or not PROJECT.fullmatch(directory.name):
        raise RuntimeError("Refusing cleanup outside the isolated test namespace")
    config, _ = command(
        compose(directory, "config", "--format", "json"), directory / "config.log"
    )
    config = json.loads(config)
    services = config["services"]
    expected = "postgres://fitz_test:disposable-test-only@postgres:5432/"
    runtime = services["runtime"]["environment"]
    if services["runtime"]["image"] != f"fitz-integration-test:{directory.name}":
        raise RuntimeError("Refusing non-test runtime image cleanup")
    for key, database in [
        ("POSTGRES_URL", "fitz_app_test"),
        ("TEST_POSTGRES_URL", "fitz_app_test"),
        ("ZERO_UPSTREAM_DB", "fitz_app_test"),
        ("ZERO_CVR_DB", "fitz_zero_test"),
        ("ZERO_CHANGE_DB", "fitz_zero_test"),
    ]:
        if runtime[key] != expected + database:
            raise RuntimeError("Refusing non-test database URL before cleanup/start")
    if runtime["ZERO_APP_ID"] != directory.name:
        raise RuntimeError("Refusing non-test Zero app ID")
    if services["postgres"]["environment"]["POSTGRES_DB"] != "fitz_app_test":
        raise RuntimeError("Refusing non-test Postgres database")
    if set(services) != {"postgres", "runtime"}:
        raise RuntimeError("Unexpected services")
    for kind, names in [("volumes", {"postgres", "zero"}), ("networks", {"default"})]:
        if set(config[kind]) != names:
            raise RuntimeError("Unexpected resources")
        for name, resource in config[kind].items():
            if (
                resource.get("external")
                or resource["name"] != f"{directory.name}_{name}"
            ):
                raise RuntimeError("Refusing non-test resource cleanup")
    if not config["networks"]["default"].get("internal"):
        raise RuntimeError("External egress must be disabled")
    for service in services.values():
        for port in service.get("ports", []):
            if port["host_ip"] != "127.0.0.1":
                raise RuntimeError("Only loopback ports are allowed")


def cleanup(directory):
    validate(directory)
    for args, filename in [
        (["logs", "--no-color", "--timestamps"], "services.log"),
        (["ps", "--all", "--format", "json"], "resources.log"),
    ]:
        try:
            command(compose(directory, *args), directory / filename, check=False)
        except Exception as error:
            # Evidence failures must not prevent bounded teardown.
            record(directory / "teardown.log", f"Evidence capture failed: {error}\n")
    command(
        compose(directory, "down", "--volumes", "--remove-orphans", "--timeout", "10"),
        directory / "teardown.log",
        timeout=60,
    )
    for kind in ("container", "volume", "network"):
        output, _ = command(
            DOCKER
            + [
                kind,
                "ls",
                *(["--all"] if kind == "container" else []),
                "-q",
                "--filter",
                f"label=com.docker.compose.project={directory.name}",
            ],
            directory / "teardown.log",
        )
        if output.strip():
            raise RuntimeError(f"Leaked test {kind}; see teardown.log")
    image = f"fitz-integration-test:{directory.name}"
    _, missing = command(
        DOCKER + ["image", "inspect", "--format", "{{.Id}}", image],
        directory / "teardown.log",
        check=False,
    )
    if not missing:
        # Only our unique tag, never a global prune or force-delete.
        command(DOCKER + ["image", "rm", image], directory / "teardown.log")
    print(f"Removed test containers, volumes and network: {directory.name}", flush=True)
    if LOG_ERRORS:
        raise RuntimeError("Test resources removed, but evidence storage failed")


def snapshot(directory):
    context = directory / "context"
    context.mkdir()
    tracked = (
        subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
        .decode()
        .split("\0")
    )
    # Include only this ticket's new sources, never arbitrary untracked files.
    added = [
        str(p.relative_to(ROOT))
        for p in (ROOT / "scripts/integration").iterdir()
        if p.is_file() and p.suffix in (".py", ".mjs", ".yaml", ".sql", "")
    ]
    added += [
        "apps/hono-api/tests/integration-fixtures.ts",
        "apps/hono-api/tests/integration-safety.mjs",
    ]
    for name in set(tracked + added):
        parts = Path(name).parts
        if not parts or any(
            p.startswith(".env")
            or p in (".git", ".npmrc", ".netrc")
            or p.endswith((".pem", ".key"))
            for p in parts
        ):
            continue
        source = ROOT / name
        if source.is_file() and not source.is_symlink():
            target = context / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
    return context


def main():
    Path(ENV["DOCKER_CONFIG"]).mkdir(parents=True, exist_ok=True, mode=0o700)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["run", "serve", "stop"])
    parser.add_argument("--id", help="existing run ID, for stop only")
    parser.add_argument(
        "--timeout", type=int, default=180, help="readiness deadline, seconds (1..600)"
    )
    parser.add_argument(
        "--port-offset",
        type=int,
        default=0,
        help="offset all four dedicated host ports",
    )
    parser.add_argument(
        "--fail-start", action="store_true", help="exercise startup failure cleanup"
    )
    argv = sys.argv[1:]
    separator = argv.index("--") if "--" in argv else len(argv)
    task = argv[separator + 1 :]
    args = parser.parse_args(argv[:separator])
    if args.mode == "stop":
        if not args.id or not PROJECT.fullmatch(args.id):
            parser.error("stop requires --id fitz_test_<12 hex digits>")
        cleanup(RUNS / args.id)
        return
    if args.id or not 1 <= args.timeout <= 600 or not 0 <= args.port_offset <= 1000:
        parser.error("invalid ID, timeout or port offset")
    for key in os.environ:
        if key in ("POSTGRES_URL", "TEST_POSTGRES_URL") or key.startswith("ZERO_"):
            parser.error(
                f"Unset {key}: this stack does not accept caller database/Zero settings"
            )
    RUNS.mkdir(parents=True, exist_ok=True)
    directory = RUNS / f"fitz_test_{secrets.token_hex(6)}"
    directory.mkdir(mode=0o700)
    for name in ("compose.yaml", "init.sql"):
        shutil.copyfile(ROOT / "scripts/integration" / name, directory / name)
    ports = dict(PG=45432, API=43100, WEB=43000, ZERO=44848)
    environment = {
        f"FITZ_TEST_{key}_PORT": value + args.port_offset
        for key, value in ports.items()
    }
    environment.update(
        FITZ_TEST_IMAGE=f"fitz-integration-test:{directory.name}",
        FITZ_TEST_PROJECT=directory.name,
        FITZ_TEST_FAIL_START=int(args.fail_start),
    )
    (directory / "compose.env").write_text(
        "".join(f"{k}={v}\n" for k, v in environment.items())
    )
    print(f"Run: {directory.name}\nEvidence: {directory}", flush=True)

    def interrupted(signum, _frame):
        raise InterruptedError(f"Cancelled by signal {signum}")

    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, interrupted)
    try:
        validate(directory)
        context = snapshot(directory)
        node = (ROOT / ".nvmrc").read_text().strip().removeprefix("v")
        if not re.fullmatch(r"24\.\d+\.\d+", node):
            raise RuntimeError("Expected repository-pinned Node 24")
        print(
            f"Building isolated snapshot with Node {node} and repository pnpm pin",
            flush=True,
        )
        command(
            DOCKER
            + [
                "build",
                "--build-arg",
                f"NODE_VERSION={node}",
                "-t",
                environment["FITZ_TEST_IMAGE"],
                "-f",
                str(context / "scripts/integration/Dockerfile"),
                str(context),
            ],
            directory / "build.log",
            timeout=1200,
        )
        shutil.rmtree(context)
        print("Starting; waiting for Postgres, Hono, web and Zero health", flush=True)
        command(
            compose(
                directory,
                "up",
                "--detach",
                "--wait",
                "--wait-timeout",
                str(args.timeout),
            ),
            directory / "startup.log",
            timeout=args.timeout + 30,
        )
        # Repeat actual HTTP readiness and save evidence, not just Docker status.
        command(
            compose(
                directory,
                "exec",
                "-T",
                "runtime",
                "node",
                "scripts/integration/health.mjs",
            ),
            directory / "health.log",
            timeout=30,
        )
        command(
            compose(
                directory,
                "exec",
                "-T",
                "postgres",
                "psql",
                "-U",
                "fitz_test",
                "-d",
                "fitz_app_test",
                "-c",
                "SELECT id, slug FROM organization ORDER BY id;",
            ),
            directory / "fixtures.log",
        )
        print(
            f"READY: web http://127.0.0.1:{environment['FITZ_TEST_WEB_PORT']}; "
            f"API :{environment['FITZ_TEST_API_PORT']}; Zero :{environment['FITZ_TEST_ZERO_PORT']}",
            flush=True,
        )
        if task:
            command(
                compose(directory, "exec", "-T", "runtime", *task),
                directory / "command.log",
                timeout=600,
            )
        elif args.mode == "serve":
            print(
                "Foreground stack; Ctrl-C or SIGTERM tears everything down.", flush=True
            )
            container, _ = command(
                compose(directory, "ps", "-q", "runtime"), directory / "resources.log"
            )
            command(
                DOCKER + ["wait", container.strip()],
                directory / "runtime-exit.log",
                timeout=None,
            )
            raise RuntimeError("Runtime exited unexpectedly; see service logs")
    finally:
        # A second cancellation must not interrupt teardown.
        for sig in (signal.SIGINT, signal.SIGTERM):
            signal.signal(sig, signal.SIG_IGN)
        cleanup(directory)


if __name__ == "__main__":
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        print(sanitized(str(error)), file=sys.stderr)
        sys.exit(1)
