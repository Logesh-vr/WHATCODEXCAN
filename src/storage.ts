import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { decisionSchema, savedSchema, type Decision, type SavedDecision } from './model';
import { copy } from './copy';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: { storageKey: 'faultline-auth' },
        global: {
          fetch: (input, init) =>
            fetch(input, {
              ...init,
              signal: init?.signal
                ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)])
                : AbortSignal.timeout(15000),
            }),
        },
      })
    : null;
const LIBRARY = 'faultline-library-v1';
const DRAFT = 'faultline-draft-v1';
export function readDraft(): Decision | null {
  const raw = localStorage.getItem(DRAFT);
  if (!raw) return null;
  return decisionSchema.parse(JSON.parse(raw));
}
export function writeDraft(d: Decision) {
  localStorage.setItem(DRAFT, JSON.stringify(decisionSchema.parse(d)));
}
export function clearDraft() {
  localStorage.removeItem(DRAFT);
}

export async function listDecisions(userId?: string): Promise<SavedDecision[]> {
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('faultline_decisions')
      .select('id,payload,revision,updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return z.array(savedSchema).parse(data);
  }
  return z
    .array(savedSchema)
    .parse(JSON.parse(localStorage.getItem(LIBRARY) || '[]'))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}
export async function saveDecision(
  payload: Decision,
  current: SavedDecision | null,
  userId?: string,
): Promise<SavedDecision> {
  payload = decisionSchema.parse(payload);
  if (supabase && userId) {
    const request = current
      ? supabase
          .from('faultline_decisions')
          .update({ payload, revision: current.revision + 1 })
          .eq('id', current.id)
          .eq('revision', current.revision)
      : supabase.from('faultline_decisions').insert({ payload, owner_id: userId });
    const { data, error } = await request.select('id,payload,revision,updated_at').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(copy.conflict);
    return savedSchema.parse(data);
  }
  const all = await listDecisions();
  if (current && all.find((x) => x.id === current.id)?.revision !== current.revision)
    throw new Error(copy.conflict);
  const saved = {
    id: current?.id || crypto.randomUUID(),
    payload,
    revision: (current?.revision || 0) + 1,
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(LIBRARY, JSON.stringify([saved, ...all.filter((x) => x.id !== saved.id)]));
  return saved;
}
export async function deleteDecision(id: string, userId?: string) {
  if (supabase && userId) {
    const { error } = await supabase.from('faultline_decisions').delete().eq('id', id);
    if (error) throw error;
  } else
    localStorage.setItem(
      LIBRARY,
      JSON.stringify((await listDecisions()).filter((x) => x.id !== id)),
    );
}
