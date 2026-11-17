import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { filterNotes, sortNotes, type Note } from "@/lib/notes";

const exampleNotes: Note[] = [
  {
    id: "older",
    user_id: "person-a",
    title: "Daftar belanja",
    content: "Susu dan roti",
    pinned: false,
    created_at: "2026-11-01T09:00:00.000Z",
    updated_at: "2026-11-01T09:00:00.000Z",
  },
  {
    id: "pinned",
    user_id: "person-a",
    title: "Ide akhir pekan",
    content: "Jalan-jalan ke taman",
    pinned: true,
    created_at: "2026-11-01T10:00:00.000Z",
    updated_at: "2026-11-01T10:00:00.000Z",
  },
];

describe("notes helpers", () => {
  it("keeps pinned notes ahead of other notes", () => {
    expect(sortNotes(exampleNotes).map((note) => note.id)).toEqual(["pinned", "older"]);
  });

  it("searches both note titles and note contents", () => {
    expect(filterNotes(exampleNotes, "ROTI").map((note) => note.id)).toEqual(["older"]);
    expect(filterNotes(exampleNotes, "taman").map((note) => note.id)).toEqual(["pinned"]);
  });

  it("only grants notes access to signed-in users and scopes every operation to the owner", () => {
    const migration = readFileSync(resolve(process.cwd(), "drizzle/migrations/0000_create_user_notes.sql"), "utf8");
    expect(migration).toContain("GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;");
    expect(migration).toContain('FOR SELECT TO authenticated USING (auth.uid() = user_id)');
    expect(migration).toContain('FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)');
    expect(migration).toContain('FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
    expect(migration).toContain('FOR DELETE TO authenticated USING (auth.uid() = user_id)');
    expect(migration).not.toContain("TO anon");
  });
});