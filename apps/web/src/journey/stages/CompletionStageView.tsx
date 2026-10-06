import { Bonehead } from "../../mascot/Bonehead.js";
import type { CompletionStage } from "@discere/contracts";
import { levelProgress, levelTitle } from "@discere/progression-engine";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Award, BookCheck, Flame, Gem, Gift, Lightbulb, Repeat2, Sparkles, Star, Target } from "../../brand/icon-set.js";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { getLessonResult } from "../../api/endpoints.js";
import { queryKeys, useStudy } from "../../api/queries.js";
import { checkPath, checksKey, getCourseChecks } from "../../checks/api.js";
import { paths } from "../../lib/paths.js";
import { Celebration } from "../../study/Celebration.js";
import { useHeldAnnouncements } from "../../game/announcements.js";
import { useCountUp } from "../../study/use-count-up.js";
import { comboScope, useCombo } from "../../fx/combo.js";
import { celebrateFinish } from "../../fx/celebrate.js";
import { stars as starBurst, centre } from "../../fx/engine.js";
import { useExperience } from "../../study/experience.js";
import { LevelRing } from "../../game/LevelRing.js";
import { QuestBoard } from "../../game/QuestBoard.js";

/**
 * Stars measure independence, not speed: the share of the lesson's questions answered correctly
 * without hints, reveals or tutor help. A lesson done mostly with help earns none, and says so
 * kindly; a lesson with no questions shows no stars at all.
 */
export function lessonStars(independent: number, answered: number): 0 | 1 | 2 | 3 | null {
  if (answered === 0) return null;
  const share = independent / answered;
  return share >= 0.9 ? 3 : share >= 0.6 ? 2 : share >= 0.3 ? 1 : 0;
}

const verdicts = {
  3: "On your own, nearly every time",
  2: "Mostly on your own",
  1: "Some on your own, some with help",
  0: "Finished with help. These ideas come back in review, where you can try them alone.",
} as const;

function FinishStars({ count, animate }: { count: 0 | 1 | 2 | 3; animate: boolean }) {
  const { play } = useExperience();
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!animate) return;
    const timers = Array.from({ length: count }, (_, index) =>
      window.setTimeout(
        () => {
          const star = row.current?.children[index];
          if (star) starBurst(centre(star), 10, "gold");
          play("quest", index + 1);
        },
        450 + index * 380,
      ),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [animate, count, play]);
  return (
    <div
      ref={row}
      className={`finish-stars${animate ? " is-animating" : ""}`}
      role="img"
      aria-label={`${count} of 3 stars`}
    >
      {[0, 1, 2].map((index) => (
        <Star
          key={index}
          aria-hidden="true"
          size={index === 1 ? 64 : 50}
          className={index < count ? "is-earned" : ""}
          style={{ "--star-delay": `${450 + index * 380}ms` } as CSSProperties}
        />
      ))}
    </div>
  );
}

/** The level bar fills from where the lesson started to where it ended. */
function FinishLevel({ xp, gained, animate }: { xp: number; gained: number; animate: boolean }) {
  const after = levelProgress(xp);
  const before = levelProgress(Math.max(0, xp - gained));
  const crossed = animate && after.level > before.level;
  const startFraction = !animate ? after.fraction : crossed ? 0 : before.fraction;
  const [fraction, setFraction] = useState(startFraction);
  useEffect(() => {
    if (!animate) {
      setFraction(after.fraction);
      return;
    }
    const timer = window.setTimeout(() => setFraction(after.fraction), 700);
    return () => window.clearTimeout(timer);
  }, [animate, after.fraction]);
  return (
    <div className={`finish-level${crossed ? " is-level-up" : ""}`}>
      <LevelRing level={after.level + 1} fraction={fraction} size={56} stroke={5} />
      <span className="finish-level-copy">
        {crossed ? (
          <strong className="finish-level-up">
            Level {after.level + 1} reached · {levelTitle(after.level + 1)}
          </strong>
        ) : (
          <strong>
            Level {after.level + 1} · {levelTitle(after.level + 1)}
          </strong>
        )}
        <span className="finish-level-track" aria-hidden="true">
          <span style={{ width: `${fraction * 100}%` }} />
        </span>
        <span>
          {after.nextLevelXp - xp} XP to level {after.level + 2}
          {crossed ? " · one XP boost added to your items" : ""}
        </span>
      </span>
    </div>
  );
}

const heldIcons = { quest: Target, chest: Gift, achievement: Award, level: Sparkles, league: Gem };

export function CompletionStageView({
  stage,
  courseId,
  lessonId,
  nextLesson,
}: {
  stage: CompletionStage;
  courseId: string;
  lessonId: string;
  nextLesson: { id: string; title: string } | null;
}) {
  const checks = useQuery({
    queryKey: checksKey(courseId),
    queryFn: () => getCourseChecks(courseId),
    enabled: nextLesson === null,
    staleTime: 0,
  });
  const nextCheck = checks.data?.checks.find(
    (check) =>
      check.kind === "checkpoint" &&
      (check.status === "available" || check.status === "in_progress"),
  );
  const study = useStudy();
  // Held by the game watcher while the lesson ran; it clears them once the learner moves on.
  const held = useHeldAnnouncements();
  // A new level already shows on the level bar below.
  const earnedHere = held.filter((item) => item.tone !== "level");
  const location = useLocation();
  const fresh =
    typeof location.state === "object" &&
    location.state !== null &&
    (location.state as { earnedLesson?: unknown }).earnedLesson === lessonId;
  const result = useQuery({
    queryKey: queryKeys.lessonResult(courseId, lessonId),
    queryFn: () => getLessonResult(courseId, lessonId),
  });
  const [animateNumbers, setAnimateNumbers] = useState(false);
  const { celebrations } = useExperience();
  const combo = useCombo(comboScope(location.pathname));
  const heading = useRef<HTMLHeadingElement>(null);
  const xp = useCountUp(result.data?.xp ?? 0, animateNumbers);
  const earnedAt = result.data?.completedAt;
  const stars = result.data ? lessonStars(result.data.independent, result.data.answered) : null;
  const totalXp = study.data?.level?.xp;
  return (
    <div className="stage-column completion lesson-finish">
      {result.data ? (
        <Celebration
          eventKey={`lesson:${courseId}:${lessonId}:${earnedAt}`}
          fresh={fresh && stars !== 0}
          onCelebrate={() => {
            setAnimateNumbers(true);
            if (celebrations) celebrateFinish(heading.current, stars ?? 1);
          }}
        />
      ) : null}
      {result.data && stars !== null ? (
        <>
          <Bonehead
            className="finish-mascot"
            expression={stars >= 2 ? "delighted" : stars === 1 ? "proud" : "encouraging"}
            glow={stars >= 2}
            action={animateNumbers ? { name: "celebrate", key: 1 } : null}
            live
            size="100%"
          />
          <FinishStars count={stars} animate={animateNumbers} />
          <p className={`finish-verdict finish-verdict--${stars}`}>
            {result.data.independent === result.data.answered
              ? "Perfect lesson · every answer on your own"
              : verdicts[stars]}
          </p>
        </>
      ) : null}
      <h1 ref={heading}>{nextCheck ? "Ready for the course check" : stage.title}</h1>
      <p className="deck">
        {nextCheck ? "Apply what you learned to a fresh mix of questions." : stage.nextAction}
      </p>
      {result.data ? (
        <>
          <dl className="finish-stats" aria-label="This lesson">
            <div>
              <dt>
                <Sparkles size={16} aria-hidden="true" />
                Lesson XP
              </dt>
              <dd>{xp}</dd>
            </div>
            <div>
              <dt>
                <Lightbulb size={16} aria-hidden="true" />
                On your own
              </dt>
              <dd>
                {result.data.independent}
                <small> / {result.data.answered}</small>
              </dd>
            </div>
            <div>
              <dt>
                <Repeat2 size={16} aria-hidden="true" />
                Cards recalled
              </dt>
              <dd>{result.data.reviews}</dd>
            </div>
          </dl>
          {combo.best >= 3 ? (
            <p className="finish-combo">
              <Flame size={18} aria-hidden="true" /> Best run this lesson: ×{combo.best}
            </p>
          ) : null}
          {study.data?.streak.activeToday ? (
            <p className="finish-streak">
              <Flame size={18} aria-hidden="true" />
              Today counts · {study.data.streak.days}-day streak
            </p>
          ) : null}
          {totalXp !== undefined ? (
            <FinishLevel xp={totalXp} gained={result.data.xp} animate={fresh && animateNumbers} />
          ) : null}
          {earnedHere.length ? (
            <section className="finish-earned" aria-labelledby="finish-earned-title">
              <h2 id="finish-earned-title">Earned in this lesson</h2>
              <ul>
                {earnedHere.map((item) => {
                  const Icon = heldIcons[item.tone];
                  return (
                    <li
                      key={item.id}
                      className={`finish-earned-item finish-earned-item--${item.tone}`}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span>
                        <strong>{item.title}</strong> {item.detail}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
          {study.data?.quests ? <QuestBoard quests={study.data.quests} compact /> : null}
          {study.data?.daily.complete ? (
            <p className="finish-goal">
              <BookCheck size={16} aria-hidden="true" />
              Today’s goal reached
            </p>
          ) : null}
        </>
      ) : result.error ? (
        <p role="status" className="muted">
          Your lesson summary could not load. Reopen the lesson to check your saved progress.
        </p>
      ) : (
        <p role="status" className="muted">
          Adding up this lesson…
        </p>
      )}
      <div className="button-row">
        {nextLesson ? (
          <Link className="button button-primary" to={paths.lesson(courseId, nextLesson.id)}>
            Start {nextLesson.title}
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        ) : nextCheck ? (
          <Link className="button button-primary" to={checkPath(courseId, nextCheck.id)}>
            {nextCheck.status === "in_progress" ? "Continue " : "Start "}
            {nextCheck.title}
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        ) : (
          <Link className="button button-primary" to={paths.course(courseId)}>
            Back to the course
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        )}
        <Link className="button button-quiet" to={paths.progress}>
          See your progress
        </Link>
      </div>
    </div>
  );
}
