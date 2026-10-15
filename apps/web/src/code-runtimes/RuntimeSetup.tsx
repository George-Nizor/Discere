import {
  type CodeRuntimeId,
  type CodeRuntimeState,
  CodeRuntimeStateSchema,
  CodeRuntimesResponseSchema,
} from "@discere/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useEffect, useRef } from "react";
import { errorMessage, requestJson } from "../api/client.js";

const runtimesKey = ["code-runtimes"] as const;

const megabytes = (bytes = 0) => Math.round(bytes / 1048576) + " MB";

/**
 * Offers the one-time toolchain download where practice code runs. It shows nothing once the
 * toolchain is ready, so a page can always include it.
 */
export function RuntimeSetup({ runtime }: { runtime: CodeRuntimeId }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: runtimesKey,
    queryFn: async () => CodeRuntimesResponseSchema.parse(await requestJson("/api/code-runtimes")),
    refetchInterval: (current) =>
      current.state.data?.runtimes.some((r) => r.state === "installing") ? 1000 : false,
  });
  const install = useMutation({
    mutationFn: async () =>
      CodeRuntimeStateSchema.parse(
        await requestJson(`/api/code-runtimes/${runtime}/install`, { method: "POST", body: "{}" }),
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: runtimesKey }),
  });
  const state: CodeRuntimeState | undefined = query.data?.runtimes.find((r) => r.id === runtime);
  // When a download finishes, everything that asked whether the toolchain was there asks again.
  const previous = useRef(state?.state);
  useEffect(() => {
    if (previous.current === "installing" && state?.state === "ready")
      void client.invalidateQueries();
    previous.current = state?.state;
  }, [client, state?.state]);
  if (!state || state.state === "ready") return null;
  if (state.state === "manual")
    return (
      <p className="runtime-setup" role="status">
        {state.message}
      </p>
    );
  if (state.state === "installing")
    return (
      <div className="runtime-setup" role="status">
        <p>
          Downloading {state.name}: {Math.round((state.progress ?? 0) * 100)}% of{" "}
          {megabytes(state.downloadBytes)}. You can keep reading while it finishes.
        </p>
        <progress max={1} value={state.progress ?? 0} />
      </div>
    );
  return (
    <div className="runtime-setup">
      <p>
        {state.state === "failed"
          ? state.message
          : `${state.name} isn't on this computer yet. Discere downloads it once (${megabytes(
              state.downloadBytes,
            )}) and keeps it for every lesson and project.`}
      </p>
      <button
        type="button"
        className="button button-secondary"
        disabled={install.isPending}
        onClick={() => install.mutate()}
      >
        <Download size={16} aria-hidden="true" />
        {state.state === "failed" ? "Try again" : `Download ${state.name}`}
      </button>
      {install.error ? (
        <p role="alert">{errorMessage(install.error, "The download could not start.")}</p>
      ) : null}
    </div>
  );
}
