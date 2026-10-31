# OrbStack Lifecycle Management Integration for sf-vtt-ctl.sh

**Date:** 2026-10-31  
**Status:** Approved  
**Author:** Antigravity  

---

## 1. Problem Statement

When running `./sf-vtt-ctl.sh` (such as `start`, `stop`, or `status`) on macOS while OrbStack is stopped, the script hangs indefinitely. The hang occurs because Docker CLI commands (`docker info`, `docker ps`, `docker compose down`) attempt to establish a TCP/socket connection with `/var/run/docker.sock` or `~/.orbstack/run/docker.sock` which is dormant when OrbStack is not active.

Additionally, when `./sf-vtt-ctl.sh stop` shuts down the Star Frontiers VTT server, client, and Docker container, OrbStack remains running in the background, consuming CPU, memory, and battery cycles unnecessarily.

---

## 2. Root Cause Analysis

1. In `ensure_docker()`, the script immediately invokes `docker info >/dev/null 2>&1` before checking whether the Docker engine / OrbStack application is running.
2. In `is_container_running()`, `docker ps` is invoked without checking daemon readiness. When called from `stop_all()` or `stop_backend()`, this hangs if OrbStack is down.
3. In `show_status()`, `docker info` is directly queried without prior state verification, causing status checks to stall.
4. When OrbStack was previously stopped, the script attempted `orb start` without ensuring that the macOS application bundle (`/Applications/OrbStack.app`) was actually launched and initialized.
5. In `stop_all()`, after `docker compose down`, no call was made to terminate OrbStack.

---

## 3. Architecture & Implementation Design

### 3.1 OrbStack Helper Functions

In [`sf-vtt-ctl.sh`](file:///Users/jrf/star-frontiers-vtt/sf-vtt-ctl.sh), implement dedicated helper functions:

```bash
has_orbstack() {
  command -v orbctl >/dev/null 2>&1 || command -v orb >/dev/null 2>&1
}

get_orbstack_status() {
  if ! has_orbstack; then
    echo "Unavailable"
    return 1
  fi
  local status
  status="$(orbctl status 2>/dev/null || orb status 2>/dev/null || echo "Stopped")"
  echo "$status"
}

ensure_orbstack_running() {
  if ! has_orbstack; then
    return 0
  fi

  local status
  status="$(get_orbstack_status)"

  if [ "$status" = "Running" ]; then
    return 0
  fi

  log_info "OrbStack is currently $status. Launching OrbStack in background..."
  # Launch OrbStack application bundle in background without stealing window focus
  if [ -d "/Applications/OrbStack.app" ]; then
    open -g -a OrbStack 2>/dev/null || true
  else
    orbctl start >/dev/null 2>&1 || orb start >/dev/null 2>&1 || true
  fi

  local count=0
  local max_wait=30
  while [ $count -lt $max_wait ]; do
    status="$(get_orbstack_status)"
    if [ "$status" = "Running" ]; then
      log_success "OrbStack is running and responsive."
      return 0
    fi
    sleep 1
    count=$((count + 1))
  done

  log_error "OrbStack failed to start within ${max_wait}s."
  return 1
}

shutdown_orbstack() {
  if ! has_orbstack; then
    return 0
  fi

  local status
  status="$(get_orbstack_status)"
  if [ "$status" = "Running" ]; then
    log_info "Stopping OrbStack service to conserve system resources..."
    orbctl stop >/dev/null 2>&1 || orb stop >/dev/null 2>&1 || true
    log_success "OrbStack service stopped."
  fi
}
```

### 3.2 Integration with Existing Control Flow

1. **`ensure_docker()`:**
   - Call `ensure_orbstack_running` first.
   - Verify `docker info >/dev/null 2>&1` only after OrbStack is verified to be `Running` (or if OrbStack is unavailable).
   - If `docker info` fails, provide clear troubleshooting output.

2. **`is_docker_ready()` helper:**
   - If `has_orbstack`, check if `get_orbstack_status` equals `Running`. If not, immediately return 1 without calling Docker CLI.
   - Prevents `docker ps` or `docker compose` hangs.

3. **`stop_all()`:**
   - Check if Docker is ready before trying container operations.
   - If container was running, stop backend, frontend, and run `docker compose down`.
   - Call `shutdown_orbstack()` unconditionally at the conclusion of `stop_all()`.

4. **`show_status()`:**
   - If `has_orbstack` and `get_orbstack_status` is not `Running`:
     - Display:
       ```
       OrbStack:                    STOPPED
       Container (sf-vtt-dev):      STOPPED
       Backend API (port 3000):     STOPPED
       Frontend UI (port 3001):     STOPPED
       ```
     - Return cleanly without invoking `docker info` or `docker ps`.

---

## 4. Verification & Testing

1. **Syntax & Static Analysis:** Validate script syntax with `bash -n sf-vtt-ctl.sh`.
2. **Status check while Running:** Execute `./sf-vtt-ctl.sh status` and confirm quick reporting.
3. **Start validation:** Verify `./sf-vtt-ctl.sh start` detects running OrbStack and starts backend/frontend cleanly.
4. **Stop validation:**
   - Run `./sf-vtt-ctl.sh stop`.
   - Verify container stops and `shutdown_orbstack()` runs `orbctl stop`.
   - Verify `orbctl status` returns `Stopped`.
5. **Cold-start recovery:**
   - While OrbStack is stopped, run `./sf-vtt-ctl.sh status` -> reports `STOPPED` in < 1 second with no hang.
   - Run `./sf-vtt-ctl.sh start` -> starts OrbStack, waits until `Running`, brings up container and dev servers.
