import { useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, StickyNote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isPasswordRecoveryLink } from "@/lib/password-recovery";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Atur ulang kata sandi — Catat" },
      {
        name: "description",
        content: "Buat kata sandi baru untuk melanjutkan menggunakan Catat.",
      },
      { property: "og:title", content: "Atur ulang kata sandi — Catat" },
      {
        property: "og:description",
        content: "Buat kata sandi baru untuk melanjutkan menggunakan Catat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

type ResetState = "checking" | "invalid" | "ready" | "success";

function ResetPasswordPage() {
  const [state, setState] = useState<ResetState>("checking");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setState(isPasswordRecoveryLink(window.location.hash) ? "ready" : "invalid");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    if (password !== confirmation) {
      setError("Kata sandi belum sama.");
      return;
    }

    setPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) {
      setError("Kata sandi belum bisa diperbarui. Tautan mungkin sudah kedaluwarsa.");
      return;
    }
    setState("success");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-note-canvas px-5 py-12 text-note-ink">
      <section className="w-full max-w-[430px]">
        <div className="mb-10 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-md bg-note-accent text-primary-foreground">
            <StickyNote aria-hidden="true" className="size-5" />
          </span>
          <span className="text-xl font-semibold">Catat</span>
        </div>

        {state === "checking" && <p role="status" className="text-sm text-note-dim">Memeriksa tautan…</p>}
        {state === "invalid" && (
          <div>
            <h1 className="text-3xl font-semibold leading-tight">Tautan tidak berlaku</h1>
            <p className="mt-3 text-sm leading-6 text-note-dim">
              Minta tautan pemulihan baru dari halaman masuk.
            </p>
            <Button asChild className="mt-6">
              <Link to="/">Kembali ke Catat</Link>
            </Button>
          </div>
        )}
        {state === "ready" && (
          <>
            <h1 className="text-3xl font-semibold leading-tight">Buat kata sandi baru</h1>
            <p className="mt-3 text-sm leading-6 text-note-dim">
              Gunakan kata sandi baru untuk masuk kembali ke akunmu.
            </p>
            <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2 text-sm font-medium" htmlFor="password">
                Kata sandi baru
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                />
              </label>
              <label className="block space-y-2 text-sm font-medium" htmlFor="confirmation">
                Ulangi kata sandi baru
                <Input
                  id="confirmation"
                  name="confirmation"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                />
              </label>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Menyimpan…" : "Simpan kata sandi baru"}
              </Button>
            </form>
          </>
        )}
        {state === "success" && (
          <div>
            <span className="flex size-11 items-center justify-center rounded-md bg-note-accent-soft text-note-accent">
              <Check aria-hidden="true" className="size-5" />
            </span>
            <h1 className="mt-5 text-3xl font-semibold leading-tight">Kata sandi diperbarui</h1>
            <p className="mt-3 text-sm leading-6 text-note-dim">
              Kamu sekarang bisa masuk dengan kata sandi barumu.
            </p>
            <Button asChild className="mt-6">
              <Link to="/">Lanjut ke Catat</Link>
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}