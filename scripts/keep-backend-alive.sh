#!/usr/bin/env bash
# WSL services alone do not keep a distribution running. Exit when this stack stops.
for attempt in $(seq 1 180); do
  [ "$(docker inspect -f '{{.State.Running}}' supabase_db_faultline 2>/dev/null)" = true ] && break
  sleep 1
done
while [ "$(docker inspect -f '{{.State.Running}}' supabase_db_faultline 2>/dev/null)" = true ]; do
  sleep 5
done
