import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PresentationSwitcher } from "@/components/presentation-switcher";
import type { Presentation } from "@/types";

function makePres(id: string, name: string): Presentation {
  return {
    id,
    name,
    slides: [{ id: `${id}-s1`, type: "code", title: "T", code: "x", language: "ts" }],
    activeSlideIndex: 0,
  };
}

const presentations: Presentation[] = [
  makePres("p1", "First"),
  makePres("p2", "Second"),
];

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("PresentationSwitcher", () => {
  it("renders the active presentation name on the trigger", () => {
    render(
      <PresentationSwitcher
        presentations={presentations}
        activePresentationId="p1"
        onSelect={() => {}}
        onDelete={() => {}}
        onDeleteAll={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /first/i })).toBeInTheDocument();
  });

  it("falls back to 'Untitled Presentation' when name is empty", () => {
    render(
      <PresentationSwitcher
        presentations={[makePres("p1", "")]}
        activePresentationId="p1"
        onSelect={() => {}}
        onDelete={() => {}}
        onDeleteAll={() => {}}
      />,
    );
    expect(screen.getAllByText("Untitled Presentation").length).toBeGreaterThan(0);
  });

  it("opens the menu and calls onSelect when a presentation is clicked", () => {
    const onSelect = vi.fn();
    render(
      <PresentationSwitcher
        presentations={presentations}
        activePresentationId="p1"
        onSelect={onSelect}
        onDelete={() => {}}
        onDeleteAll={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /first/i }));
    fireEvent.click(screen.getByRole("button", { name: "Second" }));

    expect(onSelect).toHaveBeenCalledWith("p2");
  });

  it("calls onDelete when delete is confirmed", () => {
    const onDelete = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <PresentationSwitcher
        presentations={presentations}
        activePresentationId="p1"
        onSelect={() => {}}
        onDelete={onDelete}
        onDeleteAll={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /first/i }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Second" }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith("p2");
  });

  it("does not call onDelete when delete is cancelled", () => {
    const onDelete = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <PresentationSwitcher
        presentations={presentations}
        activePresentationId="p1"
        onSelect={() => {}}
        onDelete={onDelete}
        onDeleteAll={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /first/i }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Second" }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("shows 'Delete all' only when more than one presentation exists", () => {
    const { rerender } = render(
      <PresentationSwitcher
        presentations={presentations}
        activePresentationId="p1"
        onSelect={() => {}}
        onDelete={() => {}}
        onDeleteAll={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /first/i }));
    expect(screen.getByRole("button", { name: /delete all presentations/i })).toBeInTheDocument();

    rerender(
      <PresentationSwitcher
        presentations={[presentations[0]]}
        activePresentationId="p1"
        onSelect={() => {}}
        onDelete={() => {}}
        onDeleteAll={() => {}}
      />,
    );
    // Menu is still open from the prior click; the rerender removed the
    // bulk-delete affordance because only one presentation remains.
    expect(
      screen.queryByRole("button", { name: /delete all presentations/i }),
    ).not.toBeInTheDocument();
  });
});
