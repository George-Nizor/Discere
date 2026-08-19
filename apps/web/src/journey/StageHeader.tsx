import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

export function StageHeader({
  courseTitle,
  coursePath,
  lessonTitle,
  stageLabel,
  position,
  total,
  utility,
}: {
  courseTitle: string;
  coursePath: string;
  lessonTitle: string;
  stageLabel: string;
  position: number;
  total: number;
  utility?: ReactNode;
}) {
  const percent = total === 0 ? 0 : Math.round((position / total) * 100);
  return (
    <header className="stage-header">
      <div className="stage-header-left">
        <Link className="stage-breadcrumb" to={coursePath}>
          {courseTitle}
        </Link>
        <p className="stage-lesson">{lessonTitle}</p>
      </div>
      <p className="stage-label">{stageLabel}</p>
      <div className="stage-header-right">
        <div className="stage-progress">
          <span aria-hidden="true" className="stage-progress-track">
            <span className="stage-progress-fill" style={{ width: `${percent}%` }} />
          </span>
          <span className="stage-progress-count">
            {position} / {total}
            <span className="sr-only"> stages</span>
          </span>
        </div>
        {utility}
        <Link aria-label="Leave the lesson" className="stage-exit" to={coursePath}>
          <X aria-hidden="true" size={18} strokeWidth={1.6} />
        </Link>
      </div>
    </header>
  );
}
