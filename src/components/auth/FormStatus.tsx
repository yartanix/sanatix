// A form-level message (a server error after submit, or a success notice).
//
// The region stays mounted and only its text changes: a live region that is
// inserted together with its message is not announced reliably by screen
// readers, one whose content changes is.
export default function FormStatus({
  message,
  tone = "error",
}: {
  message: string | null;
  tone?: "error" | "success";
}) {
  return (
    <div role={tone === "error" ? "alert" : "status"} aria-live={tone === "error" ? "assertive" : "polite"}>
      {message && (
        <p
          className={
            tone === "error"
              ? "bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl"
              : "bg-emerald-50 text-emerald-800 text-sm px-4 py-3 rounded-xl"
          }
        >
          {message}
        </p>
      )}
    </div>
  );
}
