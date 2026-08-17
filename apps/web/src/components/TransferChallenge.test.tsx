import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getTransferState: vi.fn(),
  submitTransferResponse: vi.fn(),
}));

vi.mock("../api", () => api);

import { TransferChallenge } from "./TransferChallenge";

const challenge = {
  id: "transfer-current-6v-200ohm",
  prompt: "A 6 V battery is connected across a 200 Ω resistor. Calculate the current in amperes.",
  responseType: "numeric" as const,
  expectedUnit: "A",
};

function renderChallenge(attemptId = "f5a223f7-96a1-458f-aaba-3d37857cbb3d") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TransferChallenge attemptId={attemptId} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  api.getTransferState.mockReset();
  api.submitTransferResponse.mockReset();
});

describe("TransferChallenge", () => {
  it("allows a retry after an incorrect transfer response", async () => {
    api.getTransferState.mockResolvedValue({
      challenge,
      completed: false,
      lastCorrect: null,
      feedback: null,
    });
    api.submitTransferResponse.mockResolvedValue({
      correct: false,
      feedback: "Use current equals voltage divided by resistance, then check the decimal place.",
      xpAwarded: 0,
      mastery: 0,
      completed: false,
    });

    renderChallenge();
    await screen.findByText("Use the idea in a new case");
    fireEvent.change(screen.getByLabelText("Your answer"), {
      target: { value: "0.3 A" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check transfer" }));

    expect(await screen.findByText("Try the new values again")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check transfer" })).toBeEnabled();
    expect(api.submitTransferResponse).toHaveBeenCalledWith(
      "f5a223f7-96a1-458f-aaba-3d37857cbb3d",
      {
        transferId: challenge.id,
        response: "0.3 A",
      },
    );
  });

  it("records recovery XP and closes a correct transfer", async () => {
    api.getTransferState.mockResolvedValue({
      challenge,
      completed: false,
      lastCorrect: null,
      feedback: null,
    });
    api.submitTransferResponse.mockResolvedValue({
      correct: true,
      feedback: "The transfer calculation is correct. You applied the same relationship to new values.",
      xpAwarded: 10,
      mastery: 0.11,
      completed: true,
    });

    renderChallenge();
    await screen.findByText("Use the idea in a new case");
    fireEvent.change(screen.getByLabelText("Your answer"), {
      target: { value: "30 mA" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check transfer" }));

    expect(await screen.findByText("You recovered the idea")).toBeInTheDocument();
    expect(screen.getByText(/\+10 recovery XP/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Transfer complete" })).toBeDisabled();
    await waitFor(() => expect(screen.getByLabelText("Your answer")).toBeDisabled());
  });

  it("restores an already completed transfer from server state", async () => {
    api.getTransferState.mockResolvedValue({
      challenge,
      completed: true,
      lastCorrect: true,
      feedback: "The transfer calculation is correct. You applied the same relationship to new values.",
    });

    renderChallenge();
    expect(await screen.findByText("You recovered the idea")).toBeInTheDocument();
    expect(screen.getByText("Recovery recorded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Transfer complete" })).toBeDisabled();
  });
});
