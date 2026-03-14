import { Link } from "@/i18n/navigation";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">404</h1>
      <Link href="/" className="text-[#2563eb] underline">
        Back to home
      </Link>
    </div>
  );
}
