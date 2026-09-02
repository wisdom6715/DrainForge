import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { AlertTriangle, ArrowLeft, Check, Clock, Copy, Droplets, ImageOff, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { getReport, type Report } from "@/lib/drainforgeApi";

function categoryLabel(value: string) {
  return value.replaceAll("_", " ").replace(/^\w/, (char) => char.toUpperCase());
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const severityStyles: Record<string, string> = {
  low: "bg-[#e5f2e8] text-[#5d8e74]",
  medium: "bg-[#f6efd8] text-[#a58649]",
  high: "bg-[#fae8ee] text-[#a86883]",
  critical: "bg-[#fae0e0] text-[#b1524f]",
};

export default function ReportDetail() {
  const [, params] = useRoute("/reports/:reference");
  const reference = params?.reference ?? "";
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!reference) return;
    setLoading(true);
    setError(false);
    getReport(reference)
      .then(setReport)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [reference]);

  const copyReference = () => {
    navigator.clipboard?.writeText(reference).then(() => toast.success("Tracking ID copied"));
  };

  return (
    <div className="min-h-screen bg-[#fbfaf8] text-[#403f58]">
      <div className="pointer-events-none fixed inset-0 -z-0 opacity-80" aria-hidden="true">
        <div className="absolute -left-20 top-0 h-[34rem] w-[34rem] rounded-full bg-[#e7dcf7]/55 blur-3xl" />
        <div className="absolute right-[-8rem] top-[20rem] h-[30rem] w-[30rem] rounded-full bg-[#f5dce6]/50 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-6 py-7">
        <Link href="/" className="flex items-center gap-3" aria-label="DrainForge home">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#403f58] text-[#fbfaf8]"><Droplets size={19} /></span>
          <span className="font-serif text-xl tracking-tight text-[#403f58]">DrainForge</span>
        </Link>
        <Link href="/" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7ea8]"><ArrowLeft size={15} /> Back home</Link>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 pb-24">
        {loading && (
          <div className="grid gap-4">
            <div className="h-72 animate-pulse rounded-[1.7rem] border border-white/80 bg-white/40" />
            <div className="h-40 animate-pulse rounded-[1.7rem] border border-white/80 bg-white/40" />
          </div>
        )}

        {!loading && (error || !report) && (
          <div className="grid place-items-center rounded-[1.7rem] border border-dashed border-[#d8cfe0] bg-white/40 px-6 py-24 text-center">
            <AlertTriangle className="text-[#c99b9b]" size={30} />
            <h1 className="mt-5 font-serif text-3xl text-[#403f58]">We couldn't find that report</h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#858096]">Double-check the tracking ID (e.g. DF-0C59CBDF0C) or the report title, or search again from the home page.</p>
            <Link href="/" className="mt-6 inline-flex text-xs font-semibold uppercase tracking-[0.16em] text-[#8d7ea8]">Search for a report</Link>
          </div>
        )}

        {!loading && report && (
          <div className="grid gap-6">
            <div className="overflow-hidden rounded-[1.7rem] border border-white/80 bg-white/55 shadow-[0_18px_55px_rgba(94,83,118,.08)] backdrop-blur">
              <div className="relative h-64 w-full bg-[#eee6f7] sm:h-80">
                {report.image_url ? (
                  <img src={report.image_url} alt={report.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[#c3b7d5]"><ImageOff size={36} /></div>
                )}
                <Badge className={`absolute right-4 top-4 rounded-full border-0 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] backdrop-blur ${report.status === "resolved" ? "bg-[#e4f2e8]/95 text-[#5d8e74]" : "bg-[#faf1da]/95 text-[#a58649]"}`}>
                  {report.status === "resolved" ? <span className="flex items-center gap-1.5"><Check size={12} /> Resolved</span> : <span className="flex items-center gap-1.5"><Clock size={12} /> Pending</span>}
                </Badge>
              </div>
              <div className="p-7 sm:p-9">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={copyReference} className="flex items-center gap-1.5 rounded-full border border-[#e2dce7] bg-white/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8d7ea8] hover:bg-white">
                    {report.reference} <Copy size={12} />
                  </button>
                  {report.area && <span className="flex items-center gap-1 text-xs text-[#858096]"><MapPin size={12} /> {report.area}</span>}
                </div>
                <h1 className="mt-4 font-serif text-4xl tracking-[-0.03em] text-[#403f58]">{report.title}</h1>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline" className="rounded-full border-0 bg-[#f3f0f6] px-3 py-1 uppercase tracking-[0.14em] text-[#74718b]">{categoryLabel(report.category)}</Badge>
                  <Badge className={`rounded-full border-0 px-3 py-1 uppercase tracking-[0.14em] ${severityStyles[report.severity] ?? "bg-[#f3f0f6] text-[#74718b]"}`}>{report.severity} severity</Badge>
                </div>
                {report.description && <p className="mt-6 max-w-2xl text-sm leading-7 text-[#67637c]">{report.description}</p>}
              </div>
            </div>

            <Card className="rounded-[1.5rem] border-white/80 bg-white/55 shadow-[0_14px_36px_rgba(94,83,118,.06)] backdrop-blur">
              <CardContent className="grid gap-6 p-7 sm:grid-cols-2 sm:p-8">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b96a9]">Reported</p>
                  <p className="mt-1 text-sm text-[#403f58]">{formatDate(report.created_at)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b96a9]">{report.status === "resolved" ? "Resolved" : "Current status"}</p>
                  <p className="mt-1 text-sm text-[#403f58]">{report.status === "resolved" && report.resolved_at ? formatDate(report.resolved_at) : "Awaiting action from the response team"}</p>
                </div>
                {report.address && (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b96a9]">Location</p>
                    <p className="mt-1 text-sm text-[#403f58]">{report.address}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Link href="/"><Button className="rounded-full bg-[#403f58] px-6 text-xs uppercase tracking-[0.16em]">Report another issue</Button></Link>
              <Button variant="outline" onClick={copyReference} className="rounded-full border-[#d8cfe0] bg-transparent px-6 text-xs uppercase tracking-[0.16em]">Copy tracking ID</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
