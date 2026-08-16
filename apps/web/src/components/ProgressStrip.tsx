import type { HomeResponse } from "@discere/contracts";
export function ProgressStrip({ home }: { home: HomeResponse }) {
  const average = home.progress.length === 0 ? 0 : home.progress.reduce((sum, item) => sum + item.mastery, 0) / home.progress.length;
  return <header className="progress-strip"><a className="wordmark" href="/" aria-label="Discere home">DISCERE</a><div className="mission-label"><span>Current mission</span><strong>{home.currentMission.title}</strong></div><div className="stat"><span>XP</span><strong>{home.xp}</strong></div><div className="stat"><span>Streak</span><strong>{home.streakDays}d</strong></div><div className="stat"><span>Mastery</span><strong>{Math.round(average * 100)}%</strong></div></header>;
}
