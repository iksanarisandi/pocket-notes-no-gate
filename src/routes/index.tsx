import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import {
  Check,
  ChevronLeft,
  FilePlus2,
  LogOut,
  Moon,
  Pin,
  PinOff,
  Search,
  StickyNote,
  Sun,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { filterNotes, noteDate, notePreview, noteTitle, type Note } from "@/lib/notes";
import { passwordResetRedirect } from "@/lib/password-recovery";
import { supabase } from "@/integrations/supabase/client";
import { useDarkMode } from "@/hooks/use-dark-mode";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Catat — Buku catatan pribadimu" },
      {
        name: "description",
        content: "Simpan ide dan catatan pentingmu, kapan pun kamu membutuhkannya.",
      },
      { property: "og:title", content: "Catat — Buku catatan pribadimu" },
      {
        property: "og:description",
        content: "Simpan ide dan catatan pentingmu, kapan pun kamu membutuhkannya.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotesApp,
});

function NotesApp() {
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [authPending, setAuthPending] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    void supabase.auth.getSession().then(({ data: sessionData, error }) => {
      if (error) setAuthError("Sesi masuk belum bisa diperiksa. Coba muat ulang halaman.");
      setUser(sessionData.session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setNotes([]);
      setActiveId(null);
      return;
    }

    let current = true;
    setLoadingNotes(true);
    void supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (!current) return;
        if (error) {
          toast.error("Catatan belum bisa dimuat. Coba lagi sebentar lagi.");
        } else {
          const loaded = (data ?? []) as Note[];
          setNotes(loaded);
          setActiveId(loaded[0]?.id ?? null);
        }
        setLoadingNotes(false);
      });

    return () => {
      current = false;
    };
  }, [user]);

  const visibleNotes = useMemo(() => filterNotes(notes, searchTerm), [notes, searchTerm]);
  const activeNote = notes.find((note) => note.id === activeId) ?? null;

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthPending(true);
    setAuthMessage("");
    setAuthError("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (authMode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: passwordResetRedirect(window.location.origin),
      });
      if (error) {
        setAuthError("Tautan reset belum bisa dikirim. Coba lagi nanti.");
      } else {
        setAuthMessage("Jika email terdaftar, tautan untuk membuat kata sandi baru akan dikirim.");
      }
      setAuthPending(false);
      return;
    }

    if (authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setAuthError(error.message);
      } else if (data.session) {
        setUser(data.session.user);
      } else {
        setAuthMessage("Cek emailmu untuk mengonfirmasi akun, lalu masuk kembali.");
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError("Email atau kata sandi belum cocok. Coba periksa kembali.");
      } else {
        setUser(data.user);
      }
    }

    setAuthPending(false);
  }

  async function createNote() {
    if (!user) return;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("notes")
      .insert({ user_id: user.id, title: "Catatan baru", content: "", pinned: false, updated_at: now })
      .select("*")
      .single();
    if (error) {
      toast.error("Catatan baru belum bisa dibuat.");
      return;
    }
    setNotes((existing) => [data as Note, ...existing]);
    setActiveId(data.id);
    setSearchTerm("");
  }

  function updateDraft(field: "title" | "content", value: string) {
    if (!activeNote) return;
    setNotes((existing) =>
      existing.map((note) =>
        note.id === activeNote.id ? { ...note, [field]: value } : note,
      ),
    );
  }

  async function saveNote() {
    if (!activeNote || !user) return;
    setSaving(true);
    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("notes")
      .update({ title: activeNote.title, content: activeNote.content, updated_at: updatedAt })
      .eq("id", activeNote.id)
      .eq("user_id", user.id)
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      toast.error("Perubahan belum tersimpan. Coba simpan lagi.");
      return;
    }
    setNotes((existing) => existing.map((note) => (note.id === data.id ? (data as Note) : note)));
    toast.success("Catatan tersimpan");
  }

  async function togglePinned(note: Note) {
    if (!user) return;
    const { error } = await supabase
      .from("notes")
      .update({ pinned: !note.pinned })
      .eq("id", note.id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Status sematan belum bisa diubah.");
      return;
    }
    setNotes((existing) =>
      existing.map((item) => (item.id === note.id ? { ...item, pinned: !item.pinned } : item)),
    );
  }

  async function deleteNote(note: Note) {
    if (!user) return;
    const { error } = await supabase.from("notes").delete().eq("id", note.id).eq("user_id", user.id);
    if (error) {
      toast.error("Catatan belum bisa dihapus.");
      return;
    }
    const remaining = notes.filter((item) => item.id !== note.id);
    setNotes(remaining);
    if (activeId === note.id) setActiveId(remaining[0]?.id ?? null);
    toast.success("Catatan dihapus");
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error("Belum bisa keluar. Coba lagi.");
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-note-canvas px-5 py-12 text-note-ink">
        <Button
          variant="ghost"
          size="icon"
          aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
          title={isDark ? "Mode terang" : "Mode gelap"}
          onClick={toggleDark}
          className="fixed right-4 top-4"
        >
          {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </Button>
        <section className="w-full max-w-[430px]">
          <div className="mb-10 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-md bg-note-accent text-primary-foreground">
              <StickyNote aria-hidden="true" className="size-5" />
            </span>
            <span className="text-xl font-semibold">Catat</span>
          </div>
          <h1 className="text-4xl font-semibold leading-tight">Catat yang penting.</h1>
          <p className="mt-3 text-base text-note-dim">
            Tempat tenang untuk menyimpan ide dan hal-hal yang ingin kamu ingat.
          </p>
          {authMode === "forgot" ? (
            <div className="mb-6 mt-9">
              <h2 className="text-xl font-semibold">Lupa kata sandi?</h2>
              <p className="mt-2 text-sm leading-6 text-note-dim">
                Masukkan email akunmu untuk menerima tautan pemulihan.
              </p>
            </div>
          ) : (
            <div className="mt-9 flex border-b border-note-line" role="tablist" aria-label="Jenis akun">
              <button
                type="button"
                role="tab"
                aria-selected={authMode === "signin"}
                onClick={() => {
                  setAuthMode("signin");
                  setAuthError("");
                  setAuthMessage("");
                }}
                className={`border-b-2 px-1 pb-3 text-sm font-medium ${authMode === "signin" ? "border-note-accent text-note-ink" : "border-transparent text-note-dim"}`}
              >
                Masuk
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === "signup"}
                onClick={() => {
                  setAuthMode("signup");
                  setAuthError("");
                  setAuthMessage("");
                }}
                className={`ml-6 border-b-2 px-1 pb-3 text-sm font-medium ${authMode === "signup" ? "border-note-accent text-note-ink" : "border-transparent text-note-dim"}`}
              >
                Buat akun
              </button>
            </div>
          )}
          <form className="mt-6 space-y-4" onSubmit={handleAuth}>
            <label className="block space-y-2 text-sm font-medium" htmlFor="email">
              Email
              <Input id="email" name="email" type="email" autoComplete="email" required placeholder="nama@email.com" />
            </label>
            {authMode !== "forgot" && (
              <label className="block space-y-2 text-sm font-medium" htmlFor="password">
                Kata sandi
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                  required
                  placeholder="••••••••"
                />
              </label>
            )}
            {authError && <p role="alert" className="text-sm text-destructive">{authError}</p>}
            {authMessage && <p role="status" className="text-sm text-note-dim">{authMessage}</p>}
            <Button type="submit" className="w-full" disabled={authPending}>
              {authPending
                ? "Sebentar…"
                : authMode === "forgot"
                  ? "Kirim tautan pemulihan"
                  : authMode === "signin"
                    ? "Masuk ke catatan"
                    : "Buat akun"}
            </Button>
          </form>
          {authMode === "signin" && (
            <div className="mt-3 flex justify-center">
              <Button
                type="button"
                variant="link"
                className="h-auto px-1 py-1 text-sm text-note-dim"
                onClick={() => {
                  setAuthMode("forgot");
                  setAuthError("");
                  setAuthMessage("");
                }}
              >
                Lupa kata sandi?
              </Button>
            </div>
          )}
          {authMode === "forgot" && (
            <div className="mt-3 flex justify-center">
              <Button
                type="button"
                variant="link"
                className="h-auto px-1 py-1 text-sm text-note-dim"
                onClick={() => {
                  setAuthMode("signin");
                  setAuthError("");
                  setAuthMessage("");
                }}
              >
                Kembali ke masuk
              </Button>
            </div>
          )}
          <p className="mt-5 text-center text-xs text-note-dim">Catatanmu tersimpan aman di akunmu.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-note-canvas p-3 text-note-ink sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1440px] flex-col overflow-hidden rounded-lg border border-note-line bg-note-paper sm:min-h-[calc(100vh-3rem)] sm:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b border-note-line sm:w-[340px] sm:border-b-0 sm:border-r">
          <div className="flex items-center justify-between border-b border-note-line px-5 py-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-md bg-note-accent text-primary-foreground">
                <StickyNote aria-hidden="true" className="size-[18px]" />
              </span>
              <div>
                <h1 className="text-base font-semibold">Catat</h1>
                <p className="max-w-[215px] truncate text-xs text-note-dim">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
                title={isDark ? "Mode terang" : "Mode gelap"}
                onClick={toggleDark}
              >
                {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
              </Button>
              <Button variant="ghost" size="icon" aria-label="Keluar dari akun" title="Keluar" onClick={signOut}>
                <LogOut aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <h2 className="text-sm font-semibold">Catatanmu</h2>
            <Button variant="outline" size="sm" onClick={createNote}>
              <FilePlus2 aria-hidden="true" />
              Catatan baru
            </Button>
          </div>

          <div className="px-5 pb-3">
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-note-dim" />
              <Input
                aria-label="Cari catatan"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cari catatan…"
                className="pl-9"
              />
            </div>
          </div>

          <div className="max-h-64 flex-1 overflow-y-auto px-3 pb-3 sm:max-h-none">
            {loadingNotes ? (
              <p className="px-3 py-6 text-sm text-note-dim">Memuat catatan…</p>
            ) : visibleNotes.length ? (
              <ul className="space-y-1">
                {visibleNotes.map((note) => (
                  <li key={note.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(note.id)}
                      className={`w-full rounded-md border p-3 text-left transition-colors ${activeId === note.id ? "border-note-line bg-note-highlight" : "border-transparent hover:bg-note-canvas"}`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium">{noteTitle(note)}</span>
                        {note.pinned && <Pin aria-label="Disematkan" className="size-3.5 shrink-0 text-note-accent" />}
                      </span>
                      <span className="mt-1 block line-clamp-2 text-xs leading-5 text-note-dim">
                        {notePreview(note)}
                      </span>
                      <span className="mt-2 block text-[11px] text-note-dim">{noteDate(note.updated_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-8 text-center">
                <StickyNote aria-hidden="true" className="mx-auto size-5 text-note-dim" />
                <p className="mt-3 text-sm font-medium">
                  {searchTerm ? "Tidak ada catatan yang cocok" : "Belum ada catatan"}
                </p>
                <p className="mt-1 text-xs text-note-dim">
                  {searchTerm ? "Coba kata lain." : "Mulai dengan menulis sesuatu yang ingin diingat."}
                </p>
              </div>
            )}
          </div>
          <div className="hidden items-center gap-2 border-t border-note-line px-5 py-4 text-xs text-note-dim sm:flex">
            <Check aria-hidden="true" className="size-3.5 text-note-accent" />
            Tersimpan di akunmu
          </div>
        </aside>

        <section className="flex min-h-[420px] min-w-0 flex-1 flex-col sm:min-h-0">
          {activeNote ? (
            <>
              <div className="flex min-h-16 items-center justify-between gap-3 border-b border-note-line px-4 sm:px-8">
                <div className="flex items-center gap-2 text-xs text-note-dim">
                  <ChevronLeft aria-hidden="true" className="size-4 sm:hidden" />
                  <span>{saving ? "Menyimpan…" : "Catatan"}</span>
                  <span aria-hidden="true">·</span>
                  <span>{noteDate(activeNote.updated_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={activeNote.pinned ? "Lepas sematan" : "Sematkan catatan"}
                    title={activeNote.pinned ? "Lepas sematan" : "Sematkan"}
                    onClick={() => void togglePinned(activeNote)}
                  >
                    {activeNote.pinned ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Hapus catatan"
                    title="Hapus catatan"
                    onClick={() => void deleteNote(activeNote)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                  <Button onClick={() => void saveNote()} disabled={saving}>
                    <Check aria-hidden="true" />
                    Simpan
                  </Button>
                </div>
              </div>
              <div className="mx-auto flex w-full max-w-[820px] flex-1 flex-col px-6 py-8 sm:px-12 sm:py-12">
                <Input
                  aria-label="Judul catatan"
                  value={activeNote.title}
                  onChange={(event) => updateDraft("title", event.target.value)}
                  placeholder="Judul catatan"
                  className="h-auto border-0 bg-transparent px-0 py-2 text-3xl font-semibold shadow-none placeholder:text-note-dim focus-visible:ring-0 sm:text-4xl"
                />
                <Textarea
                  aria-label="Isi catatan"
                  value={activeNote.content}
                  onChange={(event) => updateDraft("content", event.target.value)}
                  placeholder="Mulai menulis…"
                  className="mt-5 min-h-[240px] flex-1 resize-none border-0 bg-transparent px-0 py-2 text-base leading-8 shadow-none placeholder:text-note-dim focus-visible:ring-0 sm:text-lg"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
              <span className="flex size-12 items-center justify-center rounded-md bg-note-accent-soft text-note-accent">
                <StickyNote aria-hidden="true" className="size-5" />
              </span>
              <h2 className="mt-5 text-lg font-semibold">
                {searchTerm ? "Catatan tidak ditemukan" : "Ruang untuk pikiranmu"}
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-note-dim">
                {searchTerm
                  ? "Coba kata pencarian lain atau pilih catatan dari daftar."
                  : "Buat catatan baru untuk mulai menyimpan ide dan hal yang ingin kamu ingat."}
              </p>
              {!searchTerm && (
                <Button className="mt-5" onClick={createNote}>
                  <FilePlus2 aria-hidden="true" />
                  Buat catatan
                </Button>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}