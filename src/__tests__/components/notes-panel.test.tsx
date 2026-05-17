import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NotesPanel } from "@/components/notes-panel";

// jsdom doesn't implement pointer capture — shim it so drag tests work.
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}

const noop = () => {};

describe("NotesPanel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when open=false", () => {
    const { container } = render(
      <NotesPanel open={false} value="" onChange={noop} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a textarea with the provided value when open", () => {
    render(<NotesPanel open value="hello notes" onChange={noop} />);
    expect(screen.getByRole("textbox")).toHaveValue("hello notes");
  });

  it("calls onChange with the typed text", () => {
    const onChange = vi.fn();
    render(<NotesPanel open value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "my note" } });
    expect(onChange).toHaveBeenCalledWith("my note");
  });

  it("calls onChange with undefined when textarea is cleared", () => {
    const onChange = vi.fn();
    render(<NotesPanel open value="existing" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("renders the drag handle with accessible attributes", () => {
    render(<NotesPanel open value="" onChange={noop} />);
    const handle = screen.getByRole("slider");
    expect(handle).toBeInTheDocument();
    expect(handle).toHaveAttribute("aria-orientation", "vertical");
    expect(handle).toHaveAttribute("tabindex", "0");
  });

  it("ArrowUp on the handle increases height", () => {
    render(<NotesPanel open value="" onChange={noop} />);
    const handle = screen.getByRole("slider");
    const wrapper = handle.parentElement!;
    const before = parseInt(wrapper.style.height, 10);
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    const after = parseInt(wrapper.style.height, 10);
    expect(after).toBeGreaterThan(before);
  });

  it("ArrowDown on the handle decreases height (clamped to MIN)", () => {
    render(<NotesPanel open value="" onChange={noop} />);
    const handle = screen.getByRole("slider");
    const wrapper = handle.parentElement!;
    // Press ArrowDown many times to reach the minimum
    for (let i = 0; i < 50; i++) {
      fireEvent.keyDown(handle, { key: "ArrowDown" });
    }
    const final = parseInt(wrapper.style.height, 10);
    expect(final).toBe(120); // MIN_HEIGHT
  });

  it("End key sets height to MIN_HEIGHT", () => {
    render(<NotesPanel open value="" onChange={noop} />);
    const handle = screen.getByRole("slider");
    const wrapper = handle.parentElement!;
    fireEvent.keyDown(handle, { key: "End" });
    expect(parseInt(wrapper.style.height, 10)).toBe(120);
  });

  it("reads initial height from localStorage when storageKey is provided", () => {
    localStorage.setItem("test-notes-height", "350");
    render(<NotesPanel open value="" onChange={noop} storageKey="test-notes-height" />);
    const handle = screen.getByRole("slider");
    const wrapper = handle.parentElement!;
    expect(parseInt(wrapper.style.height, 10)).toBe(350);
  });

  it("pointer drag upward increases height", () => {
    render(<NotesPanel open value="" onChange={noop} />);
    const handle = screen.getByRole("slider");
    const wrapper = handle.parentElement!;
    const before = parseInt(wrapper.style.height, 10);
    fireEvent.pointerDown(handle, { clientY: 500 });
    fireEvent.pointerMove(handle, { clientY: 420 }); // moved 80px up
    const after = parseInt(wrapper.style.height, 10);
    expect(after).toBeGreaterThan(before);
  });

  it("pointer drag downward decreases height", () => {
    render(<NotesPanel open value="" onChange={noop} />);
    const handle = screen.getByRole("slider");
    const wrapper = handle.parentElement!;
    const before = parseInt(wrapper.style.height, 10);
    fireEvent.pointerDown(handle, { clientY: 300 });
    fireEvent.pointerMove(handle, { clientY: 380 }); // moved 80px down
    const after = parseInt(wrapper.style.height, 10);
    expect(after).toBeLessThan(before);
  });
});
