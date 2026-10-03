"use client";

import { useEffect, useRef, useState } from "react";
import { CpuController } from "@/game/ai";
import { FPS, MAX_HEALTH } from "@/game/constants";
import { getFighter } from "@/game/fighters";
import { Keyboard } from "@/game/input";
import { Match } from "@/game/match";
import { GameRenderer } from "@/game/render/renderer";
import { Hud, type HudState } from "./Hud";

export interface GameConfig {
  mode: "cpu" | "versus";
  p1: string;
  p2: string;
}

const STEP = 1 / FPS;

function snapshot(match: Match, config: GameConfig): HudState {
  return {
    players: match.fighters.map((f, i) => ({
      name: f.def.name.toUpperCase(),
      tag: i === 0 ? "1P" : config.mode === "cpu" ? "CPU" : "2P",
      health: f.health / MAX_HEALTH,
      wins: match.wins[i],
      score: f.score,
    })) as HudState["players"],
    timer: match.timer,
    banner: match.banner,
    matchOver: match.phase === "matchOver",
    matchWinner: match.matchWinner === null ? null : match.fighters[match.matchWinner].def.name.toUpperCase(),
  };
}

export default function Game({ config, onExit }: { config: GameConfig; onExit: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const [hud, setHud] = useState<HudState | null>(null);
  const [paused, setPaused] = useState(false);
  const [rematch, setRematch] = useState(0);

  useEffect(() => {
    const mount = mountRef.current!;
    const match = new Match(getFighter(config.p1), getFighter(config.p2));
    let renderer: GameRenderer;
    try {
      renderer = new GameRenderer(mount, match);
    } catch {
      mount.textContent = "This game needs WebGL, which isn't available in this browser.";
      return;
    }
    const keyboard = new Keyboard();
    keyboard.attach();
    const cpu = config.mode === "cpu" ? new CpuController(1) : null;

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (match.phase === "matchOver") {
        if (e.code === "Enter") setRematch((n) => n + 1);
        if (e.code === "Escape") onExit();
        return;
      }
      if (e.code === "Enter") {
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
        keyboard.clear();
      }
      if (e.code === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let hudKey = "";
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!pausedRef.current) {
        acc += dt;
        while (acc >= STEP) {
          match.step([keyboard.read(0), cpu ? cpu.think(match) : keyboard.read(1)]);
          acc -= STEP;
        }
      }
      renderer.render(pausedRef.current ? 0 : dt);
      const snap = snapshot(match, config);
      const key = JSON.stringify(snap);
      if (key !== hudKey) {
        hudKey = key;
        setHud(snap);
      }
    };
    raf = requestAnimationFrame(loop);

    const resize = new ResizeObserver(() => renderer.resize());
    resize.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      keyboard.detach();
      resize.disconnect();
      renderer.dispose();
      pausedRef.current = false;
    };
  }, [config, onExit, rematch]);

  const resume = () => {
    pausedRef.current = false;
    setPaused(false);
  };

  return (
    <div className="screen">
      <div className="arena" ref={mountRef} />
      {hud && <Hud state={hud} />}
      {paused && (
        <div className="overlay">
          <h2>PAUSED</h2>
          <button onClick={resume}>Resume (Enter)</button>
          <button onClick={onExit}>Quit to select (Esc)</button>
        </div>
      )}
      {hud?.matchOver && (
        <div className="overlay result">
          <h2>{hud.matchWinner ? `${hud.matchWinner} WINS THE MATCH` : "DRAW GAME"}</h2>
          <button onClick={() => setRematch((n) => n + 1)}>Rematch (Enter)</button>
          <button onClick={onExit}>Character select (Esc)</button>
        </div>
      )}
    </div>
  );
}
