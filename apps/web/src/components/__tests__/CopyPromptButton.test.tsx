import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CopyPromptButton } from "@/components/CopyPromptButton";

describe("CopyPromptButton", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    writeText.mockClear();
    Object.assign(navigator, { clipboard: { writeText } });
  });

  it("copies the prompt text and reports the event", async () => {
    const onCopied = vi.fn();
    render(<CopyPromptButton text="Draft a narrative" onCopied={onCopied} />);

    await userEvent.click(screen.getByRole("button", { name: "Copy prompt" }));

    expect(writeText).toHaveBeenCalledWith("Draft a narrative");
    await waitFor(() => expect(onCopied).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: "Copied ✓" })).toBeInTheDocument();
  });

  it("does not report the event when the clipboard write fails", async () => {
    writeText.mockRejectedValueOnce(new Error("denied"));
    const onCopied = vi.fn();
    render(<CopyPromptButton text="x" onCopied={onCopied} />);

    await userEvent.click(screen.getByRole("button", { name: "Copy prompt" }));

    expect(onCopied).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Copy prompt" })).toBeInTheDocument();
  });
});
