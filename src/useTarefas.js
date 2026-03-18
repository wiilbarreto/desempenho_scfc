import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

const LS_KEY = "bfsa_tarefas";

function readLS() {
  try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : []; }
  catch { return []; }
}
function writeLS(arr) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {}
}

export default function useTarefas() {
  const [tarefas, setTarefas] = useState(readLS);
  const [loading, setLoading] = useState(false);

  // Sync localStorage whenever tarefas change
  useEffect(() => { writeLS(tarefas); }, [tarefas]);

  // Load from Supabase on mount
  const fetchTarefas = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tarefas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) setTarefas(data);
    } catch (e) {
      console.error("[BFSA] Erro ao carregar tarefas:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTarefas(); }, [fetchTarefas]);

  const addTarefa = useCallback(async (t) => {
    const row = { ...t, created_at: new Date().toISOString() };
    if (supabase) {
      try {
        const { data, error } = await supabase.from("tarefas").insert([row]).select();
        if (error) throw error;
        if (data && data[0]) {
          setTarefas(prev => [data[0], ...prev]);
          return;
        }
      } catch (e) {
        console.error("[BFSA] Erro ao criar tarefa:", e.message);
      }
    }
    // Fallback local
    setTarefas(prev => [{ ...row, id: Date.now() }, ...prev]);
  }, []);

  const updateTarefa = useCallback(async (id, updates) => {
    // Optimistic update
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (supabase) {
      try {
        const { error } = await supabase.from("tarefas").update(updates).eq("id", id);
        if (error) throw error;
      } catch (e) {
        console.error("[BFSA] Erro ao atualizar tarefa:", e.message);
      }
    }
  }, []);

  const removeTarefa = useCallback(async (id) => {
    setTarefas(prev => prev.filter(t => t.id !== id));
    if (supabase) {
      try {
        const { error } = await supabase.from("tarefas").delete().eq("id", id);
        if (error) throw error;
      } catch (e) {
        console.error("[BFSA] Erro ao remover tarefa:", e.message);
      }
    }
  }, []);

  return { tarefas, loading, addTarefa, updateTarefa, removeTarefa, refresh: fetchTarefas };
}
