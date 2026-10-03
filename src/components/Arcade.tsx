"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { ROSTER } from "@/game/fighters";
import type { GameConfig } from "./Game";

// three.js needs a browser, so the game is never server-rendered.
const Game = dynamic(() => import("./Game"), {
  ssr: false,
  loading: () => <div className="loading">LOADING…</div>,
});

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

function cycle(id: string, step: number) {
  const i = ROSTER.findIndex((f) => f.id === id);
  return ROSTER[(i + step + ROSTER.length) % ROSTER.length].id;
}

function SelectScreen({ initial, onStart }: { initial: GameConfig; onStart: (c: GameConfig) => void }) {
  const [config, setConfig] = useState(initial);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, () => GameConfig> = {
        KeyA: () => ({ ...config, p1: cycle(config.p1, -1) }),
        KeyD: () => ({ ...config, p1: cycle(config.p1, 1) }),
        ArrowLeft: () => ({ ...config, p2: cycle(config.p2, -1) }),
        ArrowRight: () => ({ ...config, p2: cycle(config.p2, 1) }),
        Digit1: () => ({ ...config, mode: "cpu" }),
        Digit2: () => ({ ...config, mode: "versus" }),
      };
      if (map[e.code]) {
        e.preventDefault();
        setConfig(map[e.code]());
      } else if (e.code === "Enter" && !e.repeat) {
        onStart(config);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [config, onStart]);

  const column = (side: "p1" | "p2") => {
    const label = side === "p1" ? "PLAYER 1" : config.mode === "cpu" ? "CPU" : "PLAYER 2";
    const keys = side === "p1" ? "A / D" : "← / →";
    return (
      <div className={`select-column ${side}`}>
        <div className="select-label">
          {label} <small>{keys}</small>
        </div>
        <div className="select-cards">
          {ROSTER.map((f) => {
            const mirror = side === "p2" && config.p1 === f.id;
            const colors = mirror ? f.altColors : f.colors;
            const chosen = config[side] === f.id;
            return (
              <button
                key={f.id}
                className={`card ${chosen ? "chosen" : ""}`}
                style={{ "--gi": hex(colors.gi), "--accent": hex(colors.headband ?? colors.hair) } as React.CSSProperties}
                onClick={() => setConfig({ ...config, [side]: f.id })}
                aria-pressed={chosen}
              >
                <span className="card-figure" aria-hidden />
                <span className="card-name">{f.name.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
        <p className="select-quote">“{ROSTER.find((f) => f.id === config[side])!.quote}”</p>
      </div>
    );
  };

  return (
    <div className="select">
      <h1 className="title">
        WEB FIGHTER <span>II</span>
      </h1>
      <div className="modes" role="radiogroup" aria-label="Mode">
        <button className={config.mode === "cpu" ? "on" : ""} onClick={() => setConfig({ ...config, mode: "cpu" })} role="radio" aria-checked={config.mode === "cpu"}>
          1P VS CPU <small>1</small>
        </button>
        <button className={config.mode === "versus" ? "on" : ""} onClick={() => setConfig({ ...config, mode: "versus" })} role="radio" aria-checked={config.mode === "versus"}>
          2P VERSUS <small>2</small>
        </button>
      </div>
      <div className="select-row">
        {column("p1")}
        <div className="vs">VS</div>
        {column("p2")}
      </div>
      <button className="start" onClick={() => onStart(config)}>
        FIGHT! <small>Enter</small>
      </button>
      <table className="controls">
        <thead>
          <tr>
            <th />
            <th>Move</th>
            <th>Punch L / H</th>
            <th>Kick L / H</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>1P</th>
            <td>W A S D</td>
            <td>R / T</td>
            <td>F / G</td>
          </tr>
          <tr>
            <th>2P</th>
            <td>Arrows</td>
            <td>K / L</td>
            <td>, / .</td>
          </tr>
        </tbody>
      </table>
      <p className="moves">
        Hold back to block · ↓↘→+P Hadoken · →↓↘+P Shoryuken · ↓↙←+K Tatsumaki · ←/→+HP close: throw · Enter pause · Esc quit
      </p>
    </div>
  );
}

export function Arcade() {
  const [config, setConfig] = useState<GameConfig>({ mode: "cpu", p1: "ryu", p2: "ken" });
  const [fighting, setFighting] = useState(false);

  const start = useCallback((c: GameConfig) => {
    setConfig(c);
    setFighting(true);
  }, []);
  const exit = useCallback(() => setFighting(false), []);

  return fighting ? <Game config={config} onExit={exit} /> : <SelectScreen initial={config} onStart={start} />;
}
