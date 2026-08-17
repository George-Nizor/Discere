import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotebookSaveRequest } from "@discere/contracts";
import { getNotebookPage, saveNotebookPage } from "../api";
import { Notebook } from "./Notebook";

export function NotebookWorkspace({ lessonId }: { lessonId: string }) {
  const queryClient = useQueryClient();
  const notebook = useQuery({
    queryKey: ["notebook", lessonId],
    queryFn: () => getNotebookPage(lessonId),
  });
  const save = useMutation({
    mutationFn: (input: NotebookSaveRequest) => saveNotebookPage(lessonId, input),
    onSuccess: (page) => queryClient.setQueryData(["notebook", lessonId], page),
  });

  if (notebook.isLoading) return <section className="notebook" aria-live="polite"><p>Opening the working notebook…</p></section>;
  if (notebook.error || !notebook.data) return <section className="notebook"><p className="form-error" role="alert">{notebook.error instanceof Error ? notebook.error.message : "The working notebook could not be opened."}</p></section>;

  return <Notebook page={notebook.data} saving={save.isPending} onSave={(input) => save.mutateAsync(input)} />;
}
