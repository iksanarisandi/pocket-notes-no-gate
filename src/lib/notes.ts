export type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export function sortNotes(notes: Note[]) {
  return [...notes].sort((first, second) => {
    if (first.pinned !== second.pinned) return first.pinned ? -1 : 1;
    return Date.parse(second.updated_at) - Date.parse(first.updated_at);
  });
}

export function filterNotes(notes: Note[], searchTerm: string) {
  const query = searchTerm.trim().toLocaleLowerCase("id-ID");
  if (!query) return sortNotes(notes);

  return sortNotes(
    notes.filter((note) =>
      `${note.title}\n${note.content}`.toLocaleLowerCase("id-ID").includes(query),
    ),
  );
}

export function noteTitle(note: Note) {
  return note.title.trim() || "Tanpa judul";
}

export function notePreview(note: Note) {
  const preview = note.content.trim().replace(/\s+/g, " ");
  return preview || "Belum ada isi";
}

export function noteDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(
    new Date(value),
  );
}