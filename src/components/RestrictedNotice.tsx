import { ShieldAlert } from "lucide-react";

export default function RestrictedNotice({
  title = "Admins and HR only",
  message = "This page shows company-wide data that isn't available to your role. Switch to an Admin or HR user in the top bar to view it.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-10 text-center shadow-sm">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-warning-soft text-warning">
        <ShieldAlert size={20} strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
