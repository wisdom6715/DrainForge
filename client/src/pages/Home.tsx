import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight, Camera, Check, ChevronRight, Crosshair, Droplets, MapPin, Menu, ShieldCheck, Sparkles, Waves, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createReport, listReports } from "@/lib/drainforgeApi";
import { uploadEvidence } from "@/lib/supabase";

const reports = [
  { id: "AK-01", title: "Herbert Macaulay Culvert", location: "Akoka", type: "Blocked drain", status: "Active", age: "12 min ago", color: "lavender" },
  { id: "UY-03", title: "University Road Channel", location: "UNILAG", type: "Rising water", status: "Monitoring", age: "38 min ago", color: "mint" },
  { id: "BR-07", title: "Oluwalogbon Street", location: "Bariga", type: "Waste / plastic", status: "Resolved", age: "2 hrs ago", color: "blush" },
];

const categories = ["Blocked drain", "Flooding", "Waste / plastic", "Rising water", "Damaged drainage", "Other"];

export default function Home() {
  const [isReportOpen, setReportOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("Blocked drain");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [trackingReference, setTrackingReference] = useState("");
  const [liveReports, setLiveReports] = useState(reports);
  const [location, setLocation] = useState({ latitude: 6.5249, longitude: 3.3897, address: "Akoka, Lagos", accuracy: 12 });
  useEffect(() => { listReports().then((items) => { if (items.length) setLiveReports(items.map((item) => ({ id: item.reference, title: item.area, location: item.area, type: item.category.replaceAll("_", " "), status: item.status, age: "recently", color: "lavender" }))); }).catch(() => undefined); }, []);
  const [submitted, setSubmitted] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const progress = useMemo(() => Math.round((step / 4) * 100), [step]);

  const openReport = () => {
    setStep(1);
    setSubmitted(false);
    setDescription("");
    setEvidenceFiles([]);
    setTrackingReference("");
    setReportOpen(true);
  };

  const detectLocation = () => { if (!navigator.geolocation) return toast.error("Location is unavailable", { description: "You can still submit with the pilot location." }); navigator.geolocation.getCurrentPosition((position) => setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, address: "Current location", accuracy: position.coords.accuracy }), () => toast.info("Using pilot location", { description: "Location permission was not granted." })); };
  const submitReport = async () => 
    { 
      try { const draftReference = `draft-${crypto.randomUUID()}`; 
        const evidencePaths = (
          await Promise.all(evidenceFiles.slice(0, 3).map((file) => uploadEvidence(file, draftReference)))).filter(Boolean); 
        const result = await createReport({ category: category.toLowerCase().replaceAll(" ", "_") as never, severity: severity as never, description, latitude: location.latitude, longitude: location.longitude, address: location.address, location_accuracy: location.accuracy, evidence_paths: evidencePaths }); 
        setTrackingReference(result.reference); setSubmitted(true); toast.success("Report received", { description: `Your acknowledgement ${result.reference} is ready to track.` }); 
      } 
        catch { toast.error("Report could not be sent", { description: "Please try again when the service is available." }); 
    
      } 
    };

  return (
    <div className="min-h-screen overflow-hidden bg-[#fbfaf8] text-[#403f58]">
      <div className="pointer-events-none fixed inset-0 -z-0 opacity-80" aria-hidden="true">
        <div className="absolute -left-20 top-0 h-[34rem] w-[34rem] rounded-full bg-[#e7dcf7]/55 blur-3xl" />
        <div className="absolute right-[-8rem] top-[28rem] h-[36rem] w-[36rem] rounded-full bg-[#f5dce6]/60 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[28%] h-[28rem] w-[28rem] rounded-full bg-[#dff1e9]/55 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-12">
        <Link href="/" className="flex items-center gap-3" aria-label="DrainForge home">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#403f58] text-[#fbfaf8] shadow-[0_8px_20px_rgba(64,63,88,.16)]"><Droplets size={19} /></span>
          <span><span className="block text-[11px] font-semibold uppercase tracking-[0.32em] text-[#74718b]">Community signal</span><span className="font-serif text-xl tracking-tight text-[#403f58]">DrainForge</span></span>
        </Link>
        <nav className={`${mobileNav ? "absolute left-6 right-6 top-20 flex" : "hidden"} z-20 flex-col gap-3 rounded-2xl border border-white/60 bg-[#fffdfa]/95 p-5 shadow-xl backdrop-blur lg:static lg:flex lg:flex-row lg:items-center lg:gap-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}>
          <a href="#reports" className="text-sm text-[#74718b] transition-colors hover:text-[#403f58]">Live reports</a>
          <a href="#how-it-works" className="text-sm text-[#74718b] transition-colors hover:text-[#403f58]">How it works</a>
          <Link href="/authority" className="text-sm text-[#74718b] transition-colors hover:text-[#403f58]">Authority console</Link>
          <Button onClick={openReport} className="rounded-full bg-[#403f58] px-5 text-xs uppercase tracking-[0.18em] text-white hover:bg-[#5d5a79]">Report a problem <ArrowUpRight size={15} /></Button>
        </nav>
        <button className="rounded-full p-2 text-[#403f58] lg:hidden" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation">{mobileNav ? <X /> : <Menu />}</button>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-12 lg:grid-cols-[1fr_0.9fr] lg:px-12 lg:pb-28 lg:pt-20">
          <div className="relative">
            <span className="editorial-corner editorial-corner--tl" />
            <p className="mb-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#8d7ea8]"><span className="h-px w-8 bg-[#bcaed0]" /> UNILAG — AKOKA — BARIGA — IWAYA</p>
            <h1 className="max-w-2xl font-serif text-5xl leading-[0.98] tracking-[-0.045em] text-[#403f58] sm:text-7xl">Keep your community's <em className="font-normal text-[#8d7ea8]">drains flowing.</em></h1>
            <p className="mt-8 max-w-lg text-lg leading-8 text-[#74718b]">See a blocked drain, rising water, or flood risk? Send a clear signal to the people who can respond — before it becomes a flood.</p>
            <div className="mt-10 flex flex-wrap gap-3"><Button onClick={openReport} className="h-12 rounded-full bg-[#403f58] px-6 text-xs uppercase tracking-[0.18em] text-white hover:bg-[#5d5a79]">Report a problem <ArrowUpRight size={16} /></Button><a href="#reports" className="flex h-12 items-center gap-2 rounded-full border border-[#d7d2df] bg-white/35 px-6 text-xs uppercase tracking-[0.18em] text-[#5b5872] transition hover:bg-white/75">View live reports <ChevronRight size={16} /></a></div>
            <div className="mt-14 flex items-center gap-4 text-xs text-[#8e8ba0]"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#e8f3eb] text-[#66917a]"><ShieldCheck size={15} /></span><span>Community-powered. Authority-connected.<br /><strong className="font-medium text-[#5b5872]">Designed for action in under 60 seconds.</strong></span></div>
          </div>
          <div className="relative min-h-[25rem] overflow-hidden rounded-[2rem] border border-white/75 bg-[#f7f1fb]/75 p-5 shadow-[0_24px_80px_rgba(100,87,130,.14)] backdrop-blur-sm sm:min-h-[31rem] lg:rotate-[1.5deg]">
            <div className="absolute left-10 top-10 h-24 w-24 rounded-full border border-[#c3b7d5]/45" /><div className="absolute right-12 top-24 h-2 w-2 rounded-full bg-[#d9a7bd]" /><div className="absolute bottom-16 left-20 h-2 w-2 rounded-full bg-[#a2cfb6]" />
            <div className="relative h-full overflow-hidden rounded-[1.5rem] bg-[#eee8f5]" style={{ backgroundImage: "linear-gradient(90deg, rgba(123,112,151,.07) 1px, transparent 1px), linear-gradient(rgba(123,112,151,.07) 1px, transparent 1px)", backgroundSize: "34px 34px" }}>
              <div className="absolute left-[14%] top-[25%] h-[52%] w-[76%] rotate-[-16deg] rounded-[45%] border-[18px] border-[#dcd1e7] bg-[#e8e1ef] shadow-inner" /><div className="absolute left-[21%] top-[32%] h-[38%] w-[62%] rotate-[-16deg] rounded-[45%] border border-[#b9aec9] bg-[#d2c7db]/60" />
              <span className="absolute left-[35%] top-[40%] grid h-12 w-12 place-items-center rounded-full border-8 border-[#f8e2eb] bg-[#d291ad] text-white shadow-lg"><MapPin size={18} fill="currentColor" /></span><span className="absolute right-[23%] top-[58%] grid h-10 w-10 place-items-center rounded-full border-8 border-[#e2f3e7] bg-[#77a88e] text-white shadow-lg"><MapPin size={15} fill="currentColor" /></span>
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/80 bg-white/78 p-4 shadow-lg backdrop-blur"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8d7ea8]">Live corridor pulse</p><p className="mt-1 font-serif text-lg text-[#403f58]">17 reports this week</p></div><span className="flex items-center gap-1.5 text-xs text-[#6b9b7e]"><span className="h-2 w-2 rounded-full bg-[#77a88e]" /> Updating now</span></div></div>
            </div>
          </div>
        </section>

        <section id="reports" className="mx-auto max-w-7xl px-6 py-16 lg:px-12"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">The corridor, in view</p><h2 className="mt-2 font-serif text-4xl tracking-[-0.03em] text-[#403f58]">Reports near you</h2></div><div className="flex items-center gap-2 rounded-full border border-[#ded8e4] bg-white/45 px-4 py-2 text-xs text-[#74718b]"><span className="h-2 w-2 rounded-full bg-[#78aa8c]" /> 5 monitored sites <ChevronRight size={14} /></div></div><div className="grid gap-4 md:grid-cols-3">{liveReports.map((report) => <Card key={report.id} className="group rounded-[1.4rem] border-white/80 bg-white/55 shadow-[0_14px_36px_rgba(94,83,118,.07)] backdrop-blur transition hover:-translate-y-1 hover:bg-white/80"><CardContent className="p-5"><div className="mb-8 flex items-start justify-between"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${report.color === "lavender" ? "bg-[#eee6f7] text-[#8d7ea8]" : report.color === "mint" ? "bg-[#e4f2e8] text-[#6b9b7e]" : "bg-[#fae8ee] text-[#bf7896]"}`}><Waves size={19} /></span><Badge variant="outline" className="rounded-full border-0 bg-[#f3f0f6] text-[10px] font-medium uppercase tracking-[0.16em] text-[#74718b]">{report.status}</Badge></div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9b96a9]">{report.id} · {report.location}</p><h3 className="mt-2 font-serif text-xl text-[#403f58]">{report.title}</h3><p className="mt-2 text-sm text-[#858096]">{report.type} <span className="px-1 text-[#c1bacb]">·</span> {report.age}</p><button onClick={() => toast.info(`${report.id} selected`, { description: "Detailed report view is connected to the API contract." })} className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7ea8] transition group-hover:gap-3">View report <ArrowUpRight size={15} /></button></CardContent></Card>)}</div></section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-20 lg:px-12"><div className="grid gap-12 rounded-[2rem] border border-white/75 bg-white/35 p-8 lg:grid-cols-[0.8fr_1.2fr] lg:p-14"><div><p className="eyebrow">A clear signal, a faster response</p><h2 className="mt-3 max-w-md font-serif text-4xl leading-tight tracking-[-0.03em] text-[#403f58]">From your street to the response team.</h2><p className="mt-5 max-w-md text-sm leading-7 text-[#858096]">Every report carries the context that helps authorities act: what happened, where it happened, and how urgent it feels.</p></div><div className="grid gap-5 sm:grid-cols-3">{[["01", "Notice", "See a blocked drain or early water rise."], ["02", "Report", "Share a photo, location, and simple description."], ["03", "Follow through", "Track the status until the issue is resolved."]].map(([number, title, copy]) => <div key={number} className="relative border-l border-[#cfc5da] pl-5"><p className="font-serif text-3xl text-[#b7a8c8]">{number}</p><h3 className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-[#5b5872]">{title}</h3><p className="mt-3 text-sm leading-6 text-[#858096]">{copy}</p></div>)}</div></div></section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-[#e5e0e8] px-6 py-8 text-xs text-[#9290a2] sm:flex-row sm:items-center sm:justify-between lg:px-12"><span>© 2026 DrainForge · Pilot corridor, Lagos</span><span className="flex items-center gap-2"><Sparkles size={13} className="text-[#b7a8c8]" /> Built for earlier action.</span></footer>

      <Dialog open={isReportOpen} onOpenChange={setReportOpen}><DialogContent className="max-w-xl rounded-[1.7rem] border-white/80 bg-[#fffdfa]/95 p-0 text-[#403f58] shadow-2xl backdrop-blur-xl"><div className="p-7 sm:p-9">{submitted ? <div className="py-8 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#e4f2e8] text-[#6b9b7e]"><Check size={30} /></span><DialogTitle className="mt-6 font-serif text-3xl">Report received.</DialogTitle><DialogDescription className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#858096]">Thank you for helping keep the corridor clear. Your tracking reference is ready.</DialogDescription><div className="mx-auto mt-7 max-w-xs rounded-2xl bg-[#f4eff8] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8d7ea8]">Report ID</p><p className="mt-1 font-serif text-2xl text-[#403f58]">{trackingReference || "Awaiting reference"}</p><p className="mt-1 text-xs text-[#858096]">Status · Received</p></div><Button onClick={() => setReportOpen(false)} className="mt-8 rounded-full bg-[#403f58] px-6 text-xs uppercase tracking-[0.18em]">Done</Button></div> : <><DialogHeader><div className="mb-4 flex items-center justify-between"><span className="eyebrow">Quick report · {progress}%</span><span className="text-xs text-[#9b96a9]">Step {step} of 4</span></div><div className="mb-6 h-1 overflow-hidden rounded-full bg-[#eee9f1]"><div className="h-full rounded-full bg-[#8d7ea8] transition-all duration-300" style={{ width: `${progress}%` }} /></div><DialogTitle className="font-serif text-3xl">{step === 1 ? "What did you notice?" : step === 2 ? "Where is it?" : step === 3 ? "Add some evidence." : "A little more context."}</DialogTitle><DialogDescription className="mt-2 text-sm text-[#858096]">{step === 1 ? "Choose the closest description. You can add details next." : step === 2 ? "Your location helps the response team route the work." : step === 3 ? "A photo makes verification faster, but it is optional." : "Tell the team what is happening in your own words."}</DialogDescription></DialogHeader>{step === 1 && <><div className="mt-7 grid grid-cols-2 gap-3">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-2xl border p-4 text-left text-sm transition ${category === item ? "border-[#a896bc] bg-[#f0e9f7] text-[#403f58]" : "border-[#e5e0e8] bg-white/45 text-[#858096] hover:bg-white"}`}><span className="mb-5 block text-lg">{item === "Blocked drain" ? "▦" : item === "Flooding" ? "≈" : item === "Waste / plastic" ? "⌁" : item === "Rising water" ? "↗" : item === "Damaged drainage" ? "△" : "＋"}</span><span className="font-medium">{item}</span></button>)}</div><div className="mt-4"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b96a9]">Severity</p><div className="flex flex-wrap gap-2">{["low", "medium", "high", "critical"].map((item) => <button key={item} onClick={() => setSeverity(item)} className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.14em] ${severity === item ? "border-[#a896bc] bg-[#eee6f7] text-[#5b5872]" : "border-[#e5e0e8] text-[#9b96a9]"}`}>{item}</button>)}</div></div></>}{step === 2 && <div className="mt-7 rounded-2xl border border-[#ddd5e5] bg-[#f4eff8] p-5"><div className="flex items-start gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#8d7ea8]"><Crosshair size={19} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8d7ea8]">Location detected</p><p className="mt-1 font-serif text-xl text-[#403f58]">{location.address}</p><p className="mt-1 text-xs text-[#858096]">Accuracy ± {Math.round(location.accuracy)} metres · You can adjust the pin later</p></div></div><Button onClick={detectLocation} variant="outline" className="mt-5 rounded-full border-[#d8cfe0] bg-white/60 text-xs uppercase tracking-[0.16em]">Use my location</Button></div>}{step === 3 && <div className="mt-7 grid place-items-center rounded-2xl border border-dashed border-[#cfc5da] bg-[#faf7fb] px-5 py-12 text-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-[#eee6f7] text-[#8d7ea8]"><Camera size={22} /></span><p className="mt-4 text-sm font-medium text-[#5b5872]">Add up to 3 photos</p><p className="mt-1 text-xs text-[#9b96a9]">Photos help authorities verify the problem.</p><label className="mt-5 inline-flex cursor-pointer items-center rounded-full border border-[#d8cfe0] bg-white/60 px-4 py-2 text-xs uppercase tracking-[0.16em] text-[#5b5872]"><input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => setEvidenceFiles(Array.from(event.target.files ?? []).slice(0, 3))} />+ Add photo</label>{evidenceFiles.length > 0 && <p className="mt-3 text-xs text-[#858096]">{evidenceFiles.length} photo{evidenceFiles.length > 1 ? "s" : ""} selected</p>}</div>}{step === 4 && <div className="mt-7"><Textarea value={description} onChange={(event) => setDescription(event.target.value.slice(0, 500))} placeholder="Large amount of plastic waste is blocking the drainage entrance..." className="min-h-32 resize-none rounded-2xl border-[#ded8e4] bg-white/55 p-4 text-sm text-[#403f58] placeholder:text-[#b1acba]" /><div className="mt-2 text-right text-xs text-[#9b96a9]">{description.length} / 500</div></div>}<div className="mt-8 flex justify-between gap-3">{step > 1 ? <Button variant="outline" onClick={() => setStep(step - 1)} className="rounded-full border-[#d8cfe0] bg-transparent text-xs uppercase tracking-[0.15em]">Back</Button> : <span />}{step < 4 ? <Button onClick={() => setStep(step + 1)} className="rounded-full bg-[#403f58] px-6 text-xs uppercase tracking-[0.15em]">Continue <ChevronRight size={15} /></Button> : <Button onClick={submitReport} className="rounded-full bg-[#403f58] px-6 text-xs uppercase tracking-[0.15em]">Submit report <ArrowUpRight size={15} /></Button>}</div></>}</div></DialogContent></Dialog>
    </div>
  );
}
