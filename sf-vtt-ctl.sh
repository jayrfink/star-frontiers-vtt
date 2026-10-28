#!/usr/bin/env bash
#
# sf-vtt-ctl.sh - Control script for Star Frontiers VTT server & client processes
#
# Usage:
#   ./sf-vtt-ctl.sh [command] [target]
#
# Commands:
#   start [server|backend|client|frontend|all]
#   stop [server|backend|client|frontend|all]
#   restart [server|backend|client|frontend|all]
#   status
#   logs [server|backend|client|frontend]
#

set -euo pipefail

CONTAINER_NAME="sf-vtt-dev"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Color output helpers (if terminal attached)
if [ -t 1 ]; then
  C_RESET="\033[0m"
  C_BOLD="\033[1m"
  C_GREEN="\033[32m"
  C_YELLOW="\033[33m"
  C_RED="\033[31m"
  C_CYAN="\033[36m"
  C_MAGENTA="\033[35m"
  C_GRAY="\033[90m"
else
  C_RESET=""
  C_BOLD=""
  C_GREEN=""
  C_YELLOW=""
  C_RED=""
  C_CYAN=""
  C_MAGENTA=""
  C_GRAY=""
fi

log_info() {
  echo -e "${C_CYAN}[INFO]${C_RESET} $*"
}

log_success() {
  echo -e "${C_GREEN}[OK]${C_RESET} $*"
}

log_warn() {
  echo -e "${C_YELLOW}[WARN]${C_RESET} $*"
}

log_error() {
  echo -e "${C_RED}[ERROR]${C_RESET} $*"
}

ensure_container() {
  if ! docker ps --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}\$"; then
    log_info "Container '${CONTAINER_NAME}' is not running. Starting it via docker compose up -d..."
    (cd "$DIR" && docker compose up -d)
    sleep 1
    if ! docker ps --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}\$"; then
      log_error "Failed to start Docker container '${CONTAINER_NAME}'."
      exit 1
    fi
    log_success "Container '${CONTAINER_NAME}' is active."
  fi
}

is_container_running() {
  docker ps --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}\$"
}

is_backend_running() {
  if ! is_container_running; then
    return 1
  fi
  docker exec "$CONTAINER_NAME" pgrep -f "node.*src/index\.js" >/dev/null 2>&1
}

is_frontend_running() {
  if ! is_container_running; then
    return 1
  fi
  docker exec "$CONTAINER_NAME" pgrep -f "vite.*--port 3001|vite" >/dev/null 2>&1
}

start_backend() {
  ensure_container
  if is_backend_running; then
    log_warn "Backend server is already running (port 3000)."
    return 0
  fi

  log_info "Starting backend server on port 3000..."
  docker exec -d "$CONTAINER_NAME" sh -c "cd '$DIR/server' && npm run dev > /tmp/server.log 2>&1"

  # Wait up to 5 seconds for backend to start listening
  local count=0
  while [ $count -lt 5 ]; do
    if is_backend_running; then
      break
    fi
    sleep 1
    count=$((count + 1))
  done

  if is_backend_running; then
    log_success "Backend server started successfully (port 3000)."
  else
    log_error "Backend server failed to start. Check logs with: ./sf-vtt-ctl.sh logs backend"
    return 1
  fi
}

start_frontend() {
  ensure_container
  if is_frontend_running; then
    log_warn "Frontend server is already running (port 3001)."
    return 0
  fi

  log_info "Starting frontend Vite dev server on port 3001..."
  docker exec -d "$CONTAINER_NAME" sh -c "cd '$DIR/client' && npm run dev -- --host 0.0.0.0 --port 3001 > /tmp/client.log 2>&1"

  # Wait up to 5 seconds for frontend to start listening
  local count=0
  while [ $count -lt 5 ]; do
    if is_frontend_running; then
      break
    fi
    sleep 1
    count=$((count + 1))
  done

  if is_frontend_running; then
    log_success "Frontend server started successfully (port 3001)."
  else
    log_error "Frontend server failed to start. Check logs with: ./sf-vtt-ctl.sh logs frontend"
    return 1
  fi
}

stop_backend() {
  if ! is_container_running; then
    log_warn "Container '${CONTAINER_NAME}' is not running."
    return 0
  fi

  if ! is_backend_running; then
    log_warn "Backend server is not running."
    return 0
  fi

  log_info "Stopping backend server..."
  docker exec "$CONTAINER_NAME" pkill -f "node.*src/index\.js" || true
  sleep 1

  if is_backend_running; then
    docker exec "$CONTAINER_NAME" pkill -9 -f "node.*src/index\.js" || true
  fi
  log_success "Backend server stopped."
}

stop_frontend() {
  if ! is_container_running; then
    log_warn "Container '${CONTAINER_NAME}' is not running."
    return 0
  fi

  if ! is_frontend_running; then
    log_warn "Frontend server is not running."
    return 0
  fi

  log_info "Stopping frontend server..."
  docker exec "$CONTAINER_NAME" pkill -f "vite" || true
  docker exec "$CONTAINER_NAME" pkill -f "node.*vite" || true
  sleep 1

  if is_frontend_running; then
    docker exec "$CONTAINER_NAME" pkill -9 -f "vite" || true
  fi
  log_success "Frontend server stopped."
}

start_all() {
  log_info "Starting all servers..."
  start_backend
  start_frontend
  log_success "All servers started."
}

stop_all() {
  log_info "Stopping all servers..."
  if is_container_running; then
    stop_backend || true
    stop_frontend || true
    log_info "Stopping container '${CONTAINER_NAME}' via docker compose down..."
    (cd "$DIR" && docker compose down)
    log_success "All servers and container stopped."
  else
    log_info "Container '${CONTAINER_NAME}' is already stopped."
  fi
}

restart_backend() {
  log_info "Restarting backend server..."
  stop_backend
  start_backend
}

restart_frontend() {
  log_info "Restarting frontend server..."
  stop_frontend
  start_frontend
}

restart_all() {
  log_info "Restarting all servers..."
  if is_container_running; then
    stop_backend || true
    stop_frontend || true
  fi
  ensure_container
  start_backend
  start_frontend
  log_success "All servers restarted."
}

show_status() {
  echo -e "${C_BOLD}======================================================${C_RESET}"
  echo -e "${C_BOLD}             STAR FRONTIERS VTT STATUS                ${C_RESET}"
  echo -e "${C_BOLD}======================================================${C_RESET}"

  # 1. Container & Services Status
  echo -e "\n${C_BOLD}[SERVICES]${C_RESET}"
  if is_container_running; then
    local c_id c_ip c_uptime
    c_id=$(docker ps --filter "name=^${CONTAINER_NAME}\$" --format '{{.ID}}')
    c_ip=$(docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")
    c_uptime=$(docker ps --filter "name=^${CONTAINER_NAME}\$" --format '{{.RunningFor}}')
    echo -e "  Container (${CONTAINER_NAME}): ${C_GREEN}RUNNING${C_RESET} (ID: ${c_id}, IP: ${c_ip}, Uptime: ${c_uptime})"
  else
    echo -e "  Container (${CONTAINER_NAME}): ${C_RED}STOPPED${C_RESET}"
  fi

  if is_backend_running; then
    local b_pid b_cpu b_mem
    read -r b_pid b_cpu b_mem <<<"$(docker exec "$CONTAINER_NAME" sh -c "ps -eo pid,pcpu,pmem,args | grep -E '/usr/bin/node.*src/index\.js' | grep -v grep | awk '{print \$1, \$2, \$3}'" 2>/dev/null || echo "unknown - -")"
    echo -e "  Backend API (port 3000):     ${C_GREEN}RUNNING${C_RESET} (PID: ${b_pid}, CPU: ${b_cpu}%, MEM: ${b_mem}%)"
  else
    echo -e "  Backend API (port 3000):     ${C_RED}STOPPED${C_RESET}"
  fi

  if is_frontend_running; then
    local f_pid f_cpu f_mem
    read -r f_pid f_cpu f_mem <<<"$(docker exec "$CONTAINER_NAME" sh -c "ps -eo pid,pcpu,pmem,args | grep -E 'node.*vite' | grep -v grep | head -n1 | awk '{print \$1, \$2, \$3}'" 2>/dev/null || echo "unknown - -")"
    echo -e "  Frontend UI (port 3001):     ${C_GREEN}RUNNING${C_RESET} (PID: ${f_pid}, CPU: ${f_cpu}%, MEM: ${f_mem}%)"
  else
    echo -e "  Frontend UI (port 3001):     ${C_RED}STOPPED${C_RESET}"
  fi

  # 2. Network Connections & Sockets
  echo -e "\n${C_BOLD}[ACTIVE NETWORK CONNECTIONS]${C_RESET}"
  if is_container_running; then
    local conns
    conns=$(docker exec "$CONTAINER_NAME" python3 -c "
import socket

def get_conns():
    try:
        with open('/proc/net/tcp', 'r') as f:
            lines = f.readlines()[1:]
    except Exception:
        return []
    
    results = []
    for line in lines:
        parts = line.strip().split()
        if len(parts) < 4: continue
        state = parts[3]
        if state != '01': continue # ESTABLISHED
        loc = parts[1].split(':')
        rem = parts[2].split(':')
        l_port = int(loc[1], 16)
        r_port = int(rem[1], 16)
        if l_port in (3000, 3001):
            rem_ip = socket.inet_ntoa(bytes.fromhex(rem[0])[::-1])
            service = 'Backend (3000)' if l_port == 3000 else 'Frontend (3001)'
            results.append(f'{service} <- {rem_ip}:{r_port}')
    return results

active = get_conns()
if active:
    for c in active:
        print(c)
else:
    print('NONE')
" 2>/dev/null || echo "NONE")

    if [ "$conns" = "NONE" ] || [ -z "$conns" ]; then
      echo -e "  ${C_GRAY}No active browser/client TCP sockets established.${C_RESET}"
    else
      while IFS= read -r line; do
        echo -e "  ${C_GREEN}●${C_RESET} $line"
      done <<< "$conns"
    fi
  else
    echo -e "  ${C_GRAY}Container is not running.${C_RESET}"
  fi

  # 3. User Sessions & Authentication
  echo -e "\n${C_BOLD}[USER SESSIONS & AUTHENTICATION]${C_RESET}"
  local db_file="$DIR/data/app.db"
  local sess_file="$DIR/data/sessions.db"

  if [ -f "$sess_file" ] && [ -f "$db_file" ]; then
    local active_sessions
    active_sessions=$(sqlite3 "$sess_file" "
      ATTACH DATABASE '$db_file' AS app;
      SELECT u.username, u.role, datetime(s.expired/1000, 'unixepoch', 'localtime') as expires_at
      FROM sessions s
      JOIN app.users u ON u.id = json_extract(s.sess, '$.userId')
      WHERE s.expired > (strftime('%s', 'now') * 1000)
      ORDER BY s.expired DESC;
    " 2>/dev/null || true)

    if [ -n "$active_sessions" ]; then
      echo -e "  ${C_BOLD}Active Logged-In Sessions:${C_RESET}"
      while IFS="|" read -r u_name u_role u_exp; do
        local role_color="$C_CYAN"
        [ "$u_role" = "GameMaster" ] && role_color="$C_MAGENTA"
        echo -e "  ${C_GREEN}●${C_RESET} ${C_BOLD}${u_name}${C_RESET} (${role_color}${u_role}${C_RESET}) - Session Valid Until: ${u_exp}"
      done <<< "$active_sessions"
    else
      echo -e "  ${C_GRAY}No active/unexpired logged-in user sessions.${C_RESET}"
    fi

    # Recent historical sessions
    local recent_sessions
    recent_sessions=$(sqlite3 "$sess_file" "
      ATTACH DATABASE '$db_file' AS app;
      SELECT u.username, u.role, datetime(s.expired/1000, 'unixepoch', 'localtime') as expires_at
      FROM sessions s
      JOIN app.users u ON u.id = json_extract(s.sess, '$.userId')
      WHERE s.expired <= (strftime('%s', 'now') * 1000)
      ORDER BY s.expired DESC
      LIMIT 3;
    " 2>/dev/null || true)

    if [ -n "$recent_sessions" ]; then
      echo -e "  ${C_BOLD}Recently Active Users (Expired Sessions):${C_RESET}"
      while IFS="|" read -r u_name u_role u_exp; do
        echo -e "  ${C_GRAY}○ ${u_name} (${u_role}) - Expired: ${u_exp}${C_RESET}"
      done <<< "$recent_sessions"
    fi

    # Registered user summary
    local user_summary
    user_summary=$(sqlite3 "$db_file" "
      SELECT count(*) as total,
             sum(case when role = 'GameMaster' then 1 else 0 end) as gms,
             sum(case when role = 'Player' then 1 else 0 end) as players
      FROM users;
    " 2>/dev/null || true)

    if [ -n "$user_summary" ]; then
      IFS="|" read -r tot gms ply <<< "$user_summary"
      echo -e "  Registered Accounts: ${C_BOLD}${tot}${C_RESET} total (${gms:-0} GameMaster, ${ply:-0} Players)"
    fi
  else
    echo -e "  ${C_GRAY}Database or sessions file not found.${C_RESET}"
  fi

  # 4. Active VTT World & Campaign State
  echo -e "\n${C_BOLD}[ACTIVE VTT WORLD & CAMPAIGN]${C_RESET}"
  if [ -f "$db_file" ]; then
    local active_maps
    active_maps=$(sqlite3 "$db_file" "
      SELECT name, map_type, width, height, grid_size,
             (SELECT count(*) FROM tokens WHERE map_id = maps.id) as token_count
      FROM maps
      WHERE is_active = 1;
    " 2>/dev/null || true)

    if [ -n "$active_maps" ]; then
      while IFS="|" read -r m_name m_type m_w m_h m_grid m_tokens; do
        local type_upper
        type_upper=$(echo "$m_type" | tr '[:lower:]' '[:upper:]')
        echo -e "  Active Map: ${C_BOLD}${m_name}${C_RESET} [${type_upper}] (${m_w}x${m_h} hexes, ${m_tokens} tokens placed)"
      done <<< "$active_maps"
    else
      echo -e "  ${C_GRAY}No maps currently activated.${C_RESET}"
    fi

    local counts
    counts=$(sqlite3 "$db_file" "
      SELECT (SELECT count(*) FROM character_sheets),
             (SELECT count(*) FROM ship_sheets),
             (SELECT count(*) FROM adversary_templates),
             (SELECT count(*) FROM roll_logs);
    " 2>/dev/null || true)

    if [ -n "$counts" ]; then
      IFS="|" read -r n_chars n_ships n_adv n_rolls <<< "$counts"
      echo -e "  Campaign Assets: ${n_chars} Character Sheets | ${n_ships} Ship Sheets | ${n_adv} Adversary Templates | ${n_rolls} Rolls Logged"
    fi
  fi

  echo -e "${C_BOLD}======================================================${C_RESET}\n"
}

show_logs() {
  local target="${1:-all}"
  ensure_container

  case "$target" in
    backend|server|api)
      echo -e "${C_BOLD}--- Backend Server Logs (/tmp/server.log) ---${C_RESET}"
      docker exec "$CONTAINER_NAME" tail -n 50 /tmp/server.log 2>/dev/null || echo "No backend logs found."
      ;;
    frontend|client|vite)
      echo -e "${C_BOLD}--- Frontend Server Logs (/tmp/client.log) ---${C_RESET}"
      docker exec "$CONTAINER_NAME" tail -n 50 /tmp/client.log 2>/dev/null || echo "No frontend logs found."
      ;;
    all|*)
      echo -e "${C_BOLD}--- Backend Server Logs (/tmp/server.log) ---${C_RESET}"
      docker exec "$CONTAINER_NAME" tail -n 30 /tmp/server.log 2>/dev/null || echo "No backend logs found."
      echo ""
      echo -e "${C_BOLD}--- Frontend Server Logs (/tmp/client.log) ---${C_RESET}"
      docker exec "$CONTAINER_NAME" tail -n 30 /tmp/client.log 2>/dev/null || echo "No frontend logs found."
      ;;
  esac
}

show_help() {
  cat <<EOF
Usage: $0 <command> [target]

Commands:
  start [target]     Start servers (default: all)
  stop [target]      Stop servers (default: all)
  restart [target]   Restart servers (default: all)
  status             Show detailed status of container, servers, connected users, and active maps
  logs [target]      View recent server logs (default: all)
  help               Show this help message

Targets:
  all                Both backend and frontend servers (default)
  backend | server   Backend Node/Express server on port 3000
  frontend | client  Frontend Vite server on port 3001

Examples:
  $0 start                 # Starts both backend and frontend servers
  $0 stop                  # Stops both servers and downs the container
  $0 restart               # Restarts both servers
  $0 start backend         # Starts only the backend server
  $0 stop backend          # Stops only the backend server
  $0 restart backend       # Restarts only the backend server
  $0 start frontend        # Starts only the frontend server
  $0 stop frontend         # Stops only the frontend server
  $0 restart frontend      # Restarts only the frontend server
  $0 status                # Prints extensive status: services, active sessions, TCP sockets, active maps
EOF
}

# --- Main Entry Point ---

ACTION="${1:-}"
TARGET="${2:-all}"

case "$ACTION" in
  start)
    case "$TARGET" in
      all)
        start_all
        ;;
      backend|server|api)
        start_backend
        ;;
      frontend|client|vite)
        start_frontend
        ;;
      *)
        log_error "Unknown start target: '$TARGET'. Use 'all', 'backend', or 'frontend'."
        show_help
        exit 1
        ;;
    esac
    ;;

  stop)
    case "$TARGET" in
      all)
        stop_all
        ;;
      backend|server|api)
        stop_backend
        ;;
      frontend|client|vite)
        stop_frontend
        ;;
      *)
        log_error "Unknown stop target: '$TARGET'. Use 'all', 'backend', or 'frontend'."
        show_help
        exit 1
        ;;
    esac
    ;;

  restart)
    case "$TARGET" in
      all)
        restart_all
        ;;
      backend|server|api)
        restart_backend
        ;;
      frontend|client|vite)
        restart_frontend
        ;;
      *)
        log_error "Unknown restart target: '$TARGET'. Use 'all', 'backend', or 'frontend'."
        show_help
        exit 1
        ;;
    esac
    ;;

  status)
    show_status
    ;;

  logs)
    show_logs "$TARGET"
    ;;

  help|--help|-h)
    show_help
    ;;

  "")
    show_help
    ;;

  *)
    log_error "Unknown command: '$ACTION'"
    show_help
    exit 1
    ;;
esac
