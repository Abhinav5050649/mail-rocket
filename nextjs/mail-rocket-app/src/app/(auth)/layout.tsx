import { Logo } from "@/components/ui/logo";

/** Sign-in sits on the frame tint, with the form on a single sheet. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-frame px-4 pt-[14vh] pb-12">
      <div className="flex w-full max-w-[400px] flex-col gap-6">
        <Logo className="self-center" />
        <div className="rounded-sheet border border-border bg-sheet p-6 sm:p-8">{children}</div>
      </div>
    </main>
  );
}
