import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MiniBarChart, MiniDonut, Sparkline } from "@/components/shared/mini-charts";

describe("MiniBarChart", () => {
  it("renders items with labels", () => {
    const data = [
      { label: "A", value: 10 },
      { label: "B", value: 20 },
      { label: "C", value: 5 },
    ];
    render(<MiniBarChart data={data} />);
    expect(screen.getByText("A")).toBeDefined();
    expect(screen.getByText("B")).toBeDefined();
    expect(screen.getByText("C")).toBeDefined();
  });

  it("handles empty data", () => {
    const { container } = render(<MiniBarChart data={[]} />);
    expect(container.firstChild).toBeDefined();
  });

  it("accepts custom height", () => {
    const { container } = render(
      <MiniBarChart data={[{ label: "X", value: 10 }]} height={200} />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.height).toBe("200px");
  });
});

describe("MiniDonut", () => {
  it("renders percentage text", () => {
    render(<MiniDonut value={75} max={100} label="Test" />);
    expect(screen.getByText("75%")).toBeDefined();
  });

  it("renders label", () => {
    render(<MiniDonut value={50} max={200} label="Kapasite" />);
    expect(screen.getByText("Kapasite")).toBeDefined();
    expect(screen.getByText("25%")).toBeDefined(); // 50/200 = 25%
  });

  it("handles zero max gracefully", () => {
    render(<MiniDonut value={10} max={0} label="Zero" />);
    expect(screen.getByText("0%")).toBeDefined();
  });

  it("caps at 100%", () => {
    render(<MiniDonut value={200} max={100} label="Over" />);
    expect(screen.getByText("100%")).toBeDefined();
  });

  it("accepts custom size", () => {
    const { container } = render(
      <MiniDonut value={50} max={100} label="S" size={60} />
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("60");
  });
});

describe("Sparkline", () => {
  it("renders SVG with polyline", () => {
    const { container } = render(<Sparkline data={[1, 3, 2, 5, 4]} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeDefined();
    const polyline = svg?.querySelector("polyline");
    expect(polyline).toBeDefined();
    expect(polyline?.getAttribute("points")).toBeTruthy();
  });

  it("returns null for fewer than 2 data points", () => {
    const { container } = render(<Sparkline data={[5]} />);
    expect(container.innerHTML).toBe("");
  });

  it("handles flat data (all same value)", () => {
    const { container } = render(<Sparkline data={[5, 5, 5, 5]} />);
    const polyline = container.querySelector("polyline");
    expect(polyline).toBeDefined();
  });

  it("accepts custom dimensions", () => {
    const { container } = render(
      <Sparkline data={[1, 2, 3]} width={200} height={50} />
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("200");
    expect(svg?.getAttribute("height")).toBe("50");
  });
});
