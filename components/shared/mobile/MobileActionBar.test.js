import "@testing-library/jest-dom";
import fs from "fs";
import path from "path";
import { render, screen, fireEvent } from "@testing-library/react";
import MobileActionBar, { MobileActionButton } from "./MobileActionBar";

describe("MobileActionBar", () => {
  afterEach(() => document.body.classList.remove("has-mobile-action-bar"));

  it("renders its buttons in a labelled region portalled to <body>", () => {
    const onApprove = jest.fn();
    const { container } = render(
      <div id="page">
        <MobileActionBar label="PO decision" summary={<strong>₹15,55,004</strong>}>
          <MobileActionButton variant="reject">Reject</MobileActionButton>
          <MobileActionButton variant="approve" onClick={onApprove}>Approve</MobileActionButton>
        </MobileActionBar>
      </div>
    );
    const region = screen.getByRole("region", { name: "PO decision" });
    // Portalled out of the page so a parent's overflow/transform can't trap it.
    expect(container.querySelector("#page")).not.toContainElement(region);
    expect(region.parentElement).toBe(document.body);
    expect(screen.getByText("₹15,55,004")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Reject" })).toHaveAttribute("type", "button");
  });

  it("flags <body> while any bar is mounted, and only clears it after the last one", () => {
    const a = render(<MobileActionBar><MobileActionButton>A</MobileActionButton></MobileActionBar>);
    const b = render(<MobileActionBar><MobileActionButton>B</MobileActionButton></MobileActionBar>);
    expect(document.body).toHaveClass("has-mobile-action-bar");
    a.unmount();
    expect(document.body).toHaveClass("has-mobile-action-bar");
    b.unmount();
    expect(document.body).not.toHaveClass("has-mobile-action-bar");
  });
});

// jsdom can't evaluate media queries, so pin the CSS contract textually:
// the bar exists only on phones, clears the iOS home indicator, and the
// floating layers that used to cover it react to the body flag.
describe("phone CSS contract", () => {
  const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

  it("bar is display:none by default and fixed at <=768px with safe-area padding", () => {
    const css = read("components/shared/mobile/MobileActionBar.module.css");
    expect(css).toMatch(/\.bar,\s*\.spacer\s*{\s*display:\s*none;/);
    const phone = css.slice(css.indexOf("@media (max-width: 768px)"));
    expect(phone).toMatch(/position:\s*fixed/);
    expect(phone).toMatch(/env\(safe-area-inset-bottom/);
    expect(phone).toMatch(/min-height:\s*44px/);
  });

  it("assistant button lifts and push prompt hides when a bar is present", () => {
    expect(read("components/shared/WizardChat/WizardChat.module.css")).toMatch(/:global\(body\.has-mobile-action-bar\) \.fab/);
    expect(read("components/shared/PushPermissionPrompt.module.css")).toMatch(/:global\(body\.has-mobile-action-bar\) \.card\s*{\s*display:\s*none/);
  });

  it("viewport enables safe-area insets", () => {
    expect(read("pages/_document.js")).toMatch(/viewport-fit=cover/);
  });

  it("global phone layer is loaded after arc_v2.css", () => {
    const app = read("pages/_app.js");
    expect(app.indexOf('import "@/styles/mobile.css"')).toBeGreaterThan(app.indexOf('import "@/styles/arc_v2.css"'));
  });
});
