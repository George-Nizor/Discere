import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotebookSaveRequest, Source, TutoringMode } from "@discere/contracts";
import { getNotebookPage, saveNotebookPage } from "../api";
import { Notebook } from "./Notebook";
import { WorkingsReview } from "./WorkingsReview";

export function NotebookWorkspace({
  lessonId,
  mode,
  sources,
}: {
  lessonId: string;
  mode: TutoringMode;
  sources: Source[];
}) {
  const queryClient = useQueryClient();
  const notebook = useQuery({
    queryKey: ["notebook", lessonId],
    queryFn: () => getNotebookPage(lessonId),
  });
  const save = useMutation({
    mutationFn: (input: NotebookSaveRequest) => saveNotebookPage(lessonId, input),
    onSuccess: (page) => queryClient.setQueryData(["notebook", lessonId], page),
  });

  if (notebook.isLoading) {
    return (
      <section className="notebook" aria-live="polite">
        <p>Opening the working notebook…</p>
      </section>
    );
  }
  if (notebook.error || !notebook.data) {
    return (
      <section className="notebook">
        <p className="form-error" role="alert">
          {notebook.error instanceof Error
            ? notebook.error.message
            : "The working notebook could not be opened."}
        </p>
      </section>
    );
  }

  return (
    <>
      <Notebook
        page={notebook.data}
        saving={save.isPending}
        onSave={(input) => save.mutateAsync(input)}
      />
      <WorkingsReview page={notebook.data} mode={mode} sources={sources} />
    </>
  );
}
