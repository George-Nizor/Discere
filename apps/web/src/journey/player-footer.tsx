import { createContext, type ReactNode, useContext, useState } from "react";
import { createPortal } from "react-dom";

type FooterContext = {
  target: HTMLElement | null;
  setTarget: (element: HTMLElement | null) => void;
};
const Context = createContext<FooterContext | null>(null);

/** Reserve real layout space for controls, verdicts and worked explanations. */
export function PlayerFooterProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  return (
    <Context.Provider value={enabled ? { target, setTarget } : null}>{children}</Context.Provider>
  );
}
export function PlayerFooterSurface() {
  const footer = useContext(Context);
  return footer ? (
    <footer className="player-footer" aria-label="Lesson actions" ref={footer.setTarget} />
  ) : null;
}
export function PlayerFooterSlot({
  children,
  kind,
}: {
  children: ReactNode;
  kind: "actions" | "feedback";
}) {
  const footer = useContext(Context);
  if (!footer) return children;
  return footer.target
    ? createPortal(<div className={"player-footer-" + kind}>{children}</div>, footer.target)
    : null;
}
