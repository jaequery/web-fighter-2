export interface HudPlayer {
  name: string;
  tag: string;
  health: number;
  wins: number;
  score: number;
}

export interface HudState {
  players: [HudPlayer, HudPlayer];
  timer: number;
  banner: { text: string; sub?: string } | null;
  matchOver: boolean;
  matchWinner: string | null;
}

function Bar({ p, side }: { p: HudPlayer; side: "left" | "right" }) {
  const pct = `${Math.max(0, p.health) * 100}%`;
  return (
    <div className={`hud-player ${side}`}>
      <div className="hud-score">
        {p.tag} <span>{String(p.score).padStart(7, "0")}</span>
      </div>
      <div className="hud-bar">
        <div className="hud-bar-lag" style={{ width: pct }} />
        <div className="hud-bar-fill" style={{ width: pct }} />
      </div>
      <div className="hud-name">
        {p.name}
        <span className="hud-wins">
          {Array.from({ length: p.wins }, (_, i) => (
            <i key={i}>★</i>
          ))}
        </span>
      </div>
    </div>
  );
}

export function Hud({ state }: { state: HudState }) {
  return (
    <div className="hud" aria-live="polite">
      <div className="hud-top">
        <Bar p={state.players[0]} side="left" />
        <div className="hud-center">
          <div className="hud-ko">KO</div>
          <div className="hud-timer">{String(state.timer).padStart(2, "0")}</div>
        </div>
        <Bar p={state.players[1]} side="right" />
      </div>
      {state.banner && (
        <div className="hud-banner" key={state.banner.text}>
          <div>{state.banner.text}</div>
          {state.banner.sub && <div className="hud-banner-sub">{state.banner.sub}</div>}
        </div>
      )}
    </div>
  );
}
