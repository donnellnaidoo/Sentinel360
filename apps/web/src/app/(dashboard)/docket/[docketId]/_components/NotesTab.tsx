"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { label, NOTE_TYPE_LABELS, NOTE_TYPE_OPTIONS } from "@/lib/case-labels";
import { formatDateTime, formatRelative } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";
import { getErrorMessage, getFieldErrors } from "@/lib/trpc-errors";

import { invalidateDocket } from "../_lib/invalidate";
import { useDeepLinkFocus } from "../_lib/nav";
import { Field, FormCard, FormError, inputClass, SubmitButton } from "./ui/Field";
import { QueryState, SectionEmpty } from "./ui/SectionState";

const NOTE_MAX = 10000;

export function NotesTab({ caseId }: { caseId: string }) {
  const [noteType, setNoteType] = useState("GENERAL");
  const [content, setContent] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const notesQuery = useQuery(trpc.cases.listNotes.queryOptions({ caseId }));
  useDeepLinkFocus("note-form", true);

  const addNote = useMutation(
    trpc.cases.addNote.mutationOptions({
      onSuccess: () => {
        setContent("");
        setSubmitted(false);
        invalidateDocket(caseId, ["notes"]);
        toast.success("Note added");
        textareaRef.current?.focus();
      },
    }),
  );

  const fieldErrors = getFieldErrors(addNote.error);
  const emptyError = submitted && !content.trim() ? "Write the note before saving." : null;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitted(true);
    if (!content.trim() || content.length > NOTE_MAX) {
      textareaRef.current?.focus();
      return;
    }
    addNote.mutate({ caseId, noteType, content: content.trim() });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} noValidate>
        <FormCard id="note-form" title="Add a note" description="Record interviews, observations and follow-ups. Notes can't be edited once saved.">
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
            <Field label="Type" required>
              <select value={noteType} onChange={(e) => setNoteType(e.target.value)} className={inputClass}>
                {NOTE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Note"
              required
              count={{ value: content.length, max: NOTE_MAX }}
              error={emptyError ?? fieldErrors.content ?? (content.length > NOTE_MAX ? `Keep notes under ${NOTE_MAX.toLocaleString()} characters.` : null)}
              hint="Press Ctrl+Enter (⌘+Enter on Mac) to save."
            >
              <textarea
                ref={textareaRef}
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                }}
                className={inputClass}
              />
            </Field>
          </div>
          <FormError message={addNote.isError && !fieldErrors.content ? getErrorMessage(addNote.error) : null} />
          <div>
            <SubmitButton pending={addNote.isPending} pendingLabel="Saving…">
              Save note
            </SubmitButton>
          </div>
        </FormCard>
      </form>

      <section aria-label="Case notes">
        <QueryState
          query={notesQuery}
          isEmpty={(notes) => notes.length === 0}
          empty={
            <SectionEmpty
              icon="notes"
              title="No notes yet"
              body="Interview summaries, observations and follow-ups for this case will appear here."
            />
          }
        >
          {(notes) => (
            <ol className="space-y-3">
              {notes.map((note) => {
                const isSystem = note.noteType === "STATUS_CHANGE";
                return (
                  <li
                    key={note.id}
                    className={`p-4 rounded-xl border ${
                      isSystem
                        ? "bg-surface-container-low/50 border-dashed border-outline-variant"
                        : "bg-surface-container-low border-outline-variant/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface">
                        {isSystem && (
                          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                            sync_alt
                          </span>
                        )}
                        {label(NOTE_TYPE_LABELS, note.noteType)}
                        <span className="font-normal text-on-surface-variant">
                          · {note.authorName ?? (isSystem ? "System" : "Unknown author")}
                        </span>
                      </span>
                      <time
                        dateTime={new Date(note.createdAt).toISOString()}
                        title={formatDateTime(note.createdAt)}
                        className="text-xs text-on-surface-variant"
                      >
                        {formatRelative(note.createdAt)} · {formatDateTime(note.createdAt)}
                      </time>
                    </div>
                    <p className="text-sm leading-relaxed text-on-surface whitespace-pre-wrap">{note.content}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </QueryState>
      </section>
    </div>
  );
}
