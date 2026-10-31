#!/usr/bin/env bash
#
# test/sf-vtt-ctl.test.sh - Automated tests for sf-vtt-ctl.sh OrbStack lifecycle management
#

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CTL_SCRIPT="$DIR/sf-vtt-ctl.sh"

PASSED=0
FAILED=0

assert_eq() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ✓ $label"
    PASSED=$((PASSED + 1))
  else
    echo "  ✗ $label: expected '$expected', got '$actual'"
    FAILED=$((FAILED + 1))
  fi
}

assert_exit() {
  local label="$1"
  local expected_exit="$2"
  shift 2
  set +e
  "$@" >/dev/null 2>&1
  local actual_exit=$?
  set -e
  if [ "$expected_exit" -eq "$actual_exit" ]; then
    echo "  ✓ $label (exit code $actual_exit)"
    PASSED=$((PASSED + 1))
  else
    echo "  ✗ $label: expected exit $expected_exit, got $actual_exit"
    FAILED=$((FAILED + 1))
  fi
}

echo "=== Running sf-vtt-ctl.sh Lifecycle Tests ==="

# 1. Syntax check
echo "Test Suite: Syntax & Static Analysis"
assert_exit "bash -n syntax validation" 0 bash -n "$CTL_SCRIPT"

# 2. Host Environment Live Helpers
echo "Test Suite: Live Host Helpers"
# Source helper functions in a subshell
assert_exit "has_orbstack executes cleanly" 0 bash -c "source '$CTL_SCRIPT' && has_orbstack"
STATUS_OUTPUT=$(bash -c "source '$CTL_SCRIPT' && get_orbstack_status")
assert_exit "get_orbstack_status returns valid string" 0 test -n "$STATUS_OUTPUT"

# Verify status output has no trailing or duplicate newlines
LINE_COUNT=$(echo "$STATUS_OUTPUT" | wc -l | tr -d ' ')
assert_eq "get_orbstack_status outputs single line" "1" "$LINE_COUNT"

# 3. Unit Tests with Mocked orbctl
echo "Test Suite: Mocked OrbStack Status & Guards"

# Mock: orbctl status returns "Stopped" with exit code 1
MOCK_DIR=$(mktemp -d)
trap 'rm -rf "$MOCK_DIR"' EXIT

cat << 'EOF' > "$MOCK_DIR/orbctl"
#!/usr/bin/env bash
if [ "$1" = "status" ]; then
  echo "Stopped"
  exit 1
fi
if [ "$1" = "stop" ]; then
  echo "Stopped"
  exit 0
fi
if [ "$1" = "start" ]; then
  echo "Starting"
  exit 0
fi
exit 0
EOF
chmod +x "$MOCK_DIR/orbctl"

MOCKED_STOPPED=$(env PATH="$MOCK_DIR:$PATH" bash -c "source '$CTL_SCRIPT' && get_orbstack_status")
assert_eq "get_orbstack_status parses Stopped" "Stopped" "$MOCKED_STOPPED"

# Verify is_docker_ready fails immediately when Stopped without hanging
assert_exit "is_docker_ready returns 1 when OrbStack is Stopped" 1 env PATH="$MOCK_DIR:$PATH" bash -c "source '$CTL_SCRIPT' && is_docker_ready"

# Verify is_container_running returns 1 when OrbStack is Stopped
assert_exit "is_container_running returns 1 when OrbStack is Stopped" 1 env PATH="$MOCK_DIR:$PATH" bash -c "source '$CTL_SCRIPT' && is_container_running"

# Mock: orbctl status returns "Running" with exit code 0
cat << 'EOF' > "$MOCK_DIR/orbctl"
#!/usr/bin/env bash
if [ "$1" = "status" ]; then
  echo "Running"
  exit 0
fi
if [ "$1" = "stop" ]; then
  echo "STOP_CALLED" > /tmp/sf_mock_orb_stop.tmp
  exit 0
fi
exit 0
EOF
chmod +x "$MOCK_DIR/orbctl"

MOCKED_RUNNING=$(env PATH="$MOCK_DIR:$PATH" bash -c "source '$CTL_SCRIPT' && get_orbstack_status")
assert_eq "get_orbstack_status parses Running" "Running" "$MOCKED_RUNNING"

# Test shutdown_orbstack triggers orbctl stop when Running
rm -f /tmp/sf_mock_orb_stop.tmp
env PATH="$MOCK_DIR:$PATH" bash -c "source '$CTL_SCRIPT' && shutdown_orbstack" >/dev/null 2>&1 || true
STOP_CALLED=$(cat /tmp/sf_mock_orb_stop.tmp 2>/dev/null || echo "NOT_CALLED")
rm -f /tmp/sf_mock_orb_stop.tmp
assert_eq "shutdown_orbstack executes orbctl stop" "STOP_CALLED" "$STOP_CALLED"

echo ""
echo "=== Test Results ==="
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
exit 0
