import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { ComboMeter } from "../game/ComboMeter.js";
import { HudXp } from "../game/HudXp.js";

export function StageHeader({
  courseTitle,
  coursePath,
  lessonTitle,
  stageLabel,
  position,
  total,
  completed,
  earnedPercent,
  utility,
}: {
  courseTitle: string;
  coursePath: string;
  lessonTitle: string;
  stageLabel: string;
  position: number;
  total: number;
  completed?: number;
  earnedPercent?: number;
  utility?: ReactNode;
}) {
  const percent = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        earnedPercent ??
          (total === 0 ? 0 : ((completed ?? Math.max(0, position - 1)) / total) * 100),
      ),
    ),
  );
  return (
    <header className="stage-header">
      <div className="stage-header-left">
        <Link className="stage-breadcrumb" to={coursePath}>
          {courseTitle}
        </Link>
        <p className="stage-lesson">{lessonTitle}</p>
      </div>
      <span className="sr-only">{stageLabel}</span>
      <div className="stage-header-right">
        <div className="stage-progress">
          <span
            role="progressbar"
            aria-label="Lesson progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="stage-progress-track"
          >
            <span className="stage-progress-fill" style={{ width: `${percent}%` }} />
          </span>
          <span className="stage-progress-count">
            {position} / {total}
            <span className="sr-only"> stages</span>
          </span>
          <ComboMeter />
          <HudXp compact />
        </div>
        {utility}
        <Link aria-label="Leave the lesson" className="stage-exit" to={coursePath}>
          <X aria-hidden="true" size={18} strokeWidth={1.6} />
        </Link>
      </div>
    </header>
  );
}
