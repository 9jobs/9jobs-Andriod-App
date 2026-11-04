import { useId } from "react";

export function RobotWelcome({ passwordFocused }: { passwordFocused: boolean }) {
  const clipId = useId().replace(/:/g, "");
  return (
    <aside className="auth-robot-scene" data-private={passwordFocused} aria-label="Welcome to 9Jobs">
      <div className="auth-scene-copy">
        <span>OPPORTUNITIES START HERE</span>
        <h1>BUILD.<br />CONNECT.<br /><em>GROW.</em></h1>
      </div>
      <div className="auth-scene-grid" aria-hidden="true" />
      <div className="auth-robot-shadow" aria-hidden="true" />
      <div className="auth-robot-parallax">
        <div className="auth-robot-stage">
          <svg className="auth-robot-image" viewBox="0 0 1086 1448" role="img" aria-label="9Jobs robot waving hello">
            <defs>
              <clipPath id={`${clipId}-body`}>
                <polygon points="0,0 749,0 749,485 793,485 874,536 1086,550 1086,1448 0,1448" />
              </clipPath>
              <clipPath id={`${clipId}-hand`}>
                <polygon points="749,0 1086,0 1086,550 874,536 793,485 749,485" />
              </clipPath>
            </defs>
            <image href="/images/9jobs-welcome-robot.png" width="1086" height="1448" clipPath={`url(#${clipId}-body)`} />
            <g className="auth-robot-wave-hand">
              <image href="/images/9jobs-welcome-robot.png" width="1086" height="1448" clipPath={`url(#${clipId}-hand)`} />
            </g>
          </svg>
        </div>
      </div>
      <span className="auth-robot-status" aria-hidden="true">{passwordFocused ? "Your password stays private." : "Hey! Welcome back."}</span>
    </aside>
  );
}
