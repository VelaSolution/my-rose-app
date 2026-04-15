"use client";
import { useState, useEffect } from "react";
import type { Phase, S } from "./types";
import { loadGame } from "./lib/game-logic";
import Menu from "./components/Menu";
import Setup from "./components/Setup";
import Play from "./components/Play";
import Over from "./components/Over";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

async function cloudLoad(): Promise<S|null> {
  try {
    const sb = createSupabaseBrowserClient();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data } = await sb.from("game_saves").select("state").eq("user_id", user.id).limit(1);
    if (!data || data.length === 0) return null;
    return JSON.parse(data[0].state);
  } catch { return null; }
}
async function cloudDelete() {
  try {
    const sb = createSupabaseBrowserClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from("game_saves").delete().eq("user_id", user.id);
  } catch { /* noop */ }
}

// ── 메인 엔트리 ────────────────────────────────────────────
export default function GamePage() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [gs, setGs]       = useState<S|null>(null);
  const [saved, setSaved] = useState<S|null>(null);
  const [cloudSaved, setCloudSaved] = useState<S|null>(null);

  useEffect(()=>{
    setSaved(loadGame());
    cloudLoad().then(s => setCloudSaved(s));
  }, []);

  if (phase==="menu") return (
    <Menu
      onNew={()=>setPhase("setup")}
      onLoad={()=>{setGs(saved);setPhase("playing");}}
      saved={saved}
      cloudSaved={cloudSaved}
      onCloudLoad={()=>{setGs(cloudSaved);setPhase("playing");}}
    />
  );
  if (phase==="setup")   return <Setup onStart={s=>{setGs(s);setPhase("playing");}} />;
  if (phase==="playing" && gs) return <Play s={gs} setS={setGs} onOver={()=>setPhase("gameover")} />;
  if (phase==="gameover" && gs) return <Over s={gs} onMenu={()=>{setGs(null);setSaved(null);setPhase("menu");}} onRestart={()=>setPhase("setup")} />;
  return null;
}
