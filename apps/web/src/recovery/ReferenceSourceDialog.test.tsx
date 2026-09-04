import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { type ReferenceSource, ReferenceSourceDialog } from "./ReferenceSourceDialog.js";

const SOURCE = {
  title: "Roman Empire at its greatest extent, 117 CE",
  detail: "Tataryn · CC BY-SA 3.0 · Wikimedia Commons",
  href: "https://commons.wikimedia.org/wiki/File:Roman_Empire_Trajan_117AD.png",
} satisfies ReferenceSource;

const SOURCES: ReferenceSource[] = [SOURCE];

function DialogHarness() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button onClick={() => setOpen(true)} ref={triggerRef} type="button">
        View sources
      </button>
      {open ? (
        <ReferenceSourceDialog
          onClose={() => setOpen(false)}
          sources={SOURCES}
          triggerRef={triggerRef}
        />
      ) : null}
    </>
  );
}

afterEach(() => {
  document.body.style.overflow = "";
});

describe("ReferenceSourceDialog", () => {
  it("labels the modal, exposes attribution, and focuses its close control", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "View sources" }));

    const dialog = screen.getByRole("dialog", { name: "Sources" });
    const labelId = dialog.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId ?? "")).toHaveTextContent("Sources");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Close sources" })).toHaveFocus();
    expect(screen.getByText(SOURCE.detail)).toBeVisible();
    expect(screen.getByRole("link", { name: SOURCE.title })).toHaveAttribute("href", SOURCE.href);
  });

  it("traps forward and reverse tab movement inside the dialog", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole("button", { name: "View sources" }));

    const close = screen.getByRole("button", { name: "Close sources" });
    const source = screen.getByRole("link", { name: SOURCE.title });
    expect(close).toHaveFocus();

    await user.tab();
    expect(source).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(source).toHaveFocus();
  });

  it("closes on Escape and restores the exact trigger focus", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "View sources" });
    await user.click(trigger);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("uses a non-focusable backdrop and restores the previous body scroll style", async () => {
    const user = userEvent.setup();
    document.body.style.overflow = "scroll";
    render(<DialogHarness />);
    await user.click(screen.getByRole("button", { name: "View sources" }));

    expect(document.body.style.overflow).toBe("hidden");
    const backdrop = screen.getByRole("button", { name: "Close sources backdrop" });
    expect(backdrop).toHaveAttribute("tabindex", "-1");
    await user.click(backdrop);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("closes from its close control and restores trigger focus", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "View sources" });
    await user.click(trigger);

    await user.click(screen.getByRole("button", { name: "Close sources" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
