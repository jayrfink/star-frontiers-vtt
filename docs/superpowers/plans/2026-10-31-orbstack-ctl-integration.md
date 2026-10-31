# OrbStack Lifecycle Management Implementation Plan

**Goal:** Modify `sf-vtt-ctl.sh` to seamlessly detect OrbStack, automatically start it if stopped (preventing Docker socket connection hangs), and shut down OrbStack upon `./sf-vtt-ctl.sh stop` to save battery and CPU cycles.

**Spec Reference:** `docs/superpowers/specs/2026-10-31-orbstack-ctl-integration-design.md`

---

## Proposed Changes

### 1. `sf-vtt-ctl.sh`
- Add `has_orbstack()`, `get_orbstack_status()`, `is_docker_ready()`, `ensure_orbstack_running()`, and `shutdown_orbstack()`.
- Update `ensure_docker()` to ensure OrbStack is running prior to running `docker info`.
- Update `is_container_running()` to check `is_docker_ready()` first before running `docker ps`.
- Update `stop_all()` to cleanly stop servers/containers and execute `shutdown_orbstack()`.
- Update `show_status()` to check `get_orbstack_status()` first and display `OrbStack: STOPPED` without hanging on socket timeouts.

### 2. `server/test/sf-vtt-ctl.test.js` or `test/sf-vtt-ctl.test.sh`
- Create a test script that validates:
  - Bash syntax correctness (`bash -n sf-vtt-ctl.sh`).
  - Detection and parsing of `Running`, `Starting`, and `Stopped` states.
  - Proper sequence of container teardown and `orbctl stop` execution.

---

## Tasks

### Task 1: OrbStack Detection & Lifecycle Helpers in `sf-vtt-ctl.sh`
- [ ] Add `has_orbstack`, `get_orbstack_status`, `is_docker_ready`, `ensure_orbstack_running`, and `shutdown_orbstack` functions.
- [ ] Refactor `ensure_docker` to call `ensure_orbstack_running` before `docker info`.
- [ ] Refactor `is_container_running` to guard with `is_docker_ready`.
- [ ] Verify bash syntax with `bash -n sf-vtt-ctl.sh`.

### Task 2: Status & Teardown Integration in `sf-vtt-ctl.sh`
- [ ] In `stop_all()`, guard container check and invoke `shutdown_orbstack()` after container down.
- [ ] In `show_status()`, check `get_orbstack_status` early so that a stopped OrbStack immediately displays without querying `docker info`.
- [ ] Test `./sf-vtt-ctl.sh status` while running.

### Task 3: Automated Unit / Verification Script
- [ ] Add unit test script `server/test/ctlScript.test.js` or standalone bash tester verifying the functions under simulated `orbctl` outputs (`Running`, `Starting`, `Stopped`).
- [ ] Run test suite to verify 100% pass.

### Task 4: End-to-End Manual Verification & Commit
- [ ] Test status output (`./sf-vtt-ctl.sh status`).
- [ ] Verify clean git commit.
