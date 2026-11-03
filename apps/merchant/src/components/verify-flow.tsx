"use client";

// Sotechy's own ID check, step by step: which ID, a photo of its front (camera or upload), a selfie and a
// 3-second smile video, then check and send. Signed in on a computer, it offers a QR code to carry on with
// the phone instead. After "redo", only the parts that were asked for come back.
import { ArrowLeft, ArrowRight, Camera, Check, FileText, Loader2, Monitor, RefreshCw, Smartphone, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ID_TYPES, idTypeLabel, redoItem, redoParts, type IdType } from "@sotechy/shared";
import { idCheckStatus } from "@/lib/session-actions";
import { makePhoneLink, submitHandoff, submitIdCheck } from "@/lib/id-check-actions";
import { Illo } from "./illustrations";
import { btn } from "./ui";

type Step = "type" | "id" | "selfie" | "smile" | "review";
export interface PreviousCheck {
  idType: string;
  status: string;
  redoItems: string[];
  note: string | null;
}

const VIDEO_SECONDS = 3;

/** Big photos are shrunk on the phone first (quicker to send on mobile data); PDFs and unreadable formats go as they are */
async function shrinkPhoto(file: File, maxSide = 2400): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    return blob ? new File([blob], file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

/** A recorder format this browser can make (Safari: MP4, others: WebM) */
function recorderType() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of ["video/mp4", "video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm"]) if (MediaRecorder.isTypeSupported(t)) return t;
  return "";
}

/** The front camera while the selfie and video steps are open; `retry` asks for it again */
function useFrontCamera(on: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!on) return;
    let live = true;
    let got: MediaStream | null = null;
    const ask = navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      : Promise.reject(new Error("No camera here"));
    ask
      .then((s) => {
        got = s;
        if (live) setStream(s);
        else s.getTracks().forEach((t) => t.stop());
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      got?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
  }, [on, attempt]);
  const retry = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };
  return { stream, failed, retry };
}

/** A computer with a mouse (where the phone is offered first); never on the server */
const isComputer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches && window.innerWidth >= 900;
const noSubscribe = () => () => {};

function Progress({ steps, at }: { steps: Step[]; at: number }) {
  return (
    <div className="flex gap-1.5" aria-label={`Step ${at + 1} of ${steps.length}`}>
      {steps.map((s, i) => (
        <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= at ? "bg-brand" : "bg-line"}`} />
      ))}
    </div>
  );
}

/** The camera with an oval to put your face in */
function FaceCamera({ stream, children, ring }: { stream: MediaStream; children?: React.ReactNode; ring?: number }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (video.current) video.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-3xl bg-panel">
      <video ref={video} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
      {/* The oval, with the rest dimmed */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[72%] w-[62%] rounded-[50%] shadow-[0_0_0_999px_rgba(18,14,11,0.55)] ring-4 ring-white" />
        {ring !== undefined && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute h-[72%] w-[62%]" aria-hidden>
            <ellipse cx="50" cy="50" rx="48" ry="48" fill="none" stroke="#1fbf6a" strokeWidth="4" strokeDasharray={`${ring * 302} 400`} transform="rotate(-90 50 50)" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
      </div>
      {children}
    </div>
  );
}

export function VerifyFlow({
  mode,
  token,
  ownerName,
  previous,
  onDone,
}: {
  /** "dashboard": signed in (offers the QR on a computer); "phone": opened from the QR code */
  mode: "dashboard" | "phone";
  token?: string;
  ownerName: string | null;
  previous: PreviousCheck | null;
  onDone: () => void;
}) {
  const redo = previous?.status === "resubmit" ? previous : null;
  const parts = redo ? redoParts(redo.redoItems) : { id: true, face: true };
  const steps: Step[] = [...(parts.id ? (["type", "id"] as Step[]) : []), ...(parts.face ? (["selfie", "smile"] as Step[]) : []), "review"];

  const [step, setStep] = useState<Step>(steps[0]);
  const at = steps.indexOf(step);
  const [idType, setIdType] = useState<IdType | "">((previous?.idType as IdType) ?? "");
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [agree, setAgree] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // On a computer: offer the phone first (and again if the camera here won't open)
  const computer = useSyncExternalStore(noSubscribe, isComputer, () => false);
  const [usingComputer, setUsingComputer] = useState(false);
  const [askedPhone, setAskedPhone] = useState(false);
  const phoneOffer = mode === "dashboard" && ((computer && !usingComputer) || askedPhone);
  const setPhoneOffer = (on: boolean) => {
    setAskedPhone(on);
    if (!on) setUsingComputer(true);
  };

  const go = (s: Step) => {
    setError(null);
    setStep(s);
    window.scrollTo({ top: 0 });
  };
  const next = () => go(steps[Math.min(at + 1, steps.length - 1)]);
  const back = () => at > 0 && go(steps[at - 1]);

  const send = async () => {
    if (!agree) return setError("Tick the box to confirm these are yours");
    const form = new FormData();
    form.append("idType", idType);
    if (idPhoto) form.append("idPhoto", idPhoto);
    if (selfie) form.append("selfie", selfie);
    if (video) form.append("video", video);
    setSending(true);
    setError(null);
    const r = mode === "phone" && token ? await submitHandoff(token, form) : await submitIdCheck(form);
    setSending(false);
    if ("error" in r) setError(r.error);
    else onDone();
  };

  if (phoneOffer) return <PhoneOffer onUseComputer={() => setPhoneOffer(false)} onSent={onDone} />;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <Progress steps={steps} at={at} />

      {redo && at === 0 && (
        <div className="rounded-2xl bg-warn-soft p-4 text-sm text-warn">
          <p className="font-semibold">Redo {redo.redoItems.length === 1 ? "this" : `these ${redo.redoItems.length} things`}</p>
          <ul className="mt-1 list-disc pl-5">
            {redo.redoItems.map((c) => (
              <li key={c}>
                {redoItem(c)?.label ?? c}: {redoItem(c)?.tip}
              </li>
            ))}
          </ul>
          {redo.note && <p className="mt-2">&ldquo;{redo.note}&rdquo;</p>}
        </div>
      )}

      {step === "type" && (
        <section className="flex flex-col gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">Which ID will you use?</h1>
            <p className="mt-1 text-ink-2">It must be valid and show your full name, photo and date of birth.</p>
          </div>
          <div role="radiogroup" aria-label="ID type" className="flex flex-col gap-2">
            {ID_TYPES.map((t) => {
              const on = idType === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    if (t.value !== idType) setIdPhoto(null);
                    setIdType(t.value);
                  }}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${on ? "border-ink bg-brand-soft" : "border-line bg-surface hover:border-ink-2"}`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                    <Illo name="card" size={30} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold">{t.label}</span>
                    <span className="block text-sm text-muted">{t.hint}</span>
                  </span>
                  {on && <Check size={20} className="text-ink" />}
                </button>
              );
            })}
          </div>
          {ownerName && <p className="rounded-2xl bg-surface-alt px-4 py-3 text-sm text-ink-2">The name on your ID must match the store owner: <b>{ownerName}</b>.</p>}
          <button type="button" disabled={!idType} onClick={next} className={btn.dark}>
            Continue <ArrowRight size={16} />
          </button>
        </section>
      )}

      {step === "id" && <IdPhotoStep idType={idType as IdType} file={idPhoto} onFile={setIdPhoto} onNext={next} onBack={back} />}

      {(step === "selfie" || step === "smile") && (
        <FaceSteps
          step={step}
          selfie={selfie}
          video={video}
          onSelfie={(f) => {
            setSelfie(f);
            go("smile");
          }}
          onVideo={(f) => {
            setVideo(f);
            next();
          }}
          onBack={back}
          onUsePhone={mode === "dashboard" ? () => setPhoneOffer(true) : undefined}
        />
      )}

      {step === "review" && (
        <section className="flex flex-col gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">Check and send</h1>
            <p className="mt-1 text-ink-2">Make sure everything is clear, then send it for verification.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {parts.id && idPhoto && (
              <Preview className="col-span-2" label={`${idTypeLabel(idType)} (front)`} file={idPhoto} onChange={() => go("id")} />
            )}
            {parts.face && selfie && <Preview label="Selfie" file={selfie} onChange={() => go("selfie")} />}
            {parts.face && video && <Preview label="Smile video" file={video} onChange={() => go("smile")} />}
          </div>
          {redo && <p className="text-sm text-muted">Everything else stays as you sent it last time.</p>}
          <label className="flex items-start gap-3 text-sm text-ink-2">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[var(--c-inverse)]" />
            These are my own ID and photos, and I agree Sotechy can check them to verify my store.
          </label>
          {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={back} className={btn.outline} aria-label="Back">
              <ArrowLeft size={16} />
            </button>
            <button type="button" disabled={sending} onClick={send} className={`${btn.primary} flex-1`}>
              {sending ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Sending…
                </>
              ) : (
                "Send for verification"
              )}
            </button>
          </div>
        </section>
      )}
      {error && step !== "review" && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
    </div>
  );
}

function Preview({ label, file, onChange, className = "" }: { label: string; file: File; onChange: () => void; className?: string }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const kind = file.type.startsWith("video/") ? "video" : file.type === "application/pdf" ? "pdf" : "image";
  return (
    <div className={`flex flex-col gap-2 rounded-2xl border border-line bg-surface p-2.5 ${className}`}>
      <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-surface-alt">
        {/* A photo on this device (a blob: address), which next/image can't load */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && kind === "image" && <img src={url} alt={label} className="h-full w-full object-cover" />}
        {url && kind === "video" && <video src={url} controls playsInline className="h-full w-full object-cover" />}
        {kind === "pdf" && (
          <span className="flex flex-col items-center gap-1 text-sm text-muted">
            <FileText size={28} /> {file.name}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold">{label}</span>
        <button type="button" onClick={onChange} className="text-sm font-semibold text-brand-strong">
          Change
        </button>
      </div>
    </div>
  );
}

function IdPhotoStep({ idType, file, onFile, onNext, onBack }: { idType: IdType; file: File | null; onFile: (f: File | null) => void; onNext: () => void; onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setError(null);
    if (!(f.type.startsWith("image/") || f.type === "application/pdf")) return setError("Use a photo (JPG or PNG) or a PDF");
    if (f.size > 10 * 1024 * 1024 && f.type === "application/pdf") return setError("That PDF is over 10 MB");
    setBusy(true);
    const out = await shrinkPhoto(f);
    setBusy(false);
    if (out.size > 10 * 1024 * 1024) return setError("That photo is over 10 MB. Take it again with the camera.");
    onFile(out);
  };
  const passport = idType === "passport";
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{passport ? "Your passport's photo page" : idType === "nin" ? "Front of your NIN slip or card" : "Front of your driver's licence"}</h1>
        <p className="mt-1 text-ink-2">Just the front. Take a photo with your camera, or upload one (JPG, PNG or PDF, up to 10 MB).</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl bg-panel text-sm font-semibold text-white">
          <Camera size={24} className="text-brand" /> Take a photo
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-line bg-surface text-sm font-semibold">
          <Upload size={24} className="text-brand" /> Upload a file
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      </div>
      {busy && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={15} className="animate-spin" /> Getting it ready…
        </p>
      )}
      {file && !busy && <Preview label="Your photo" file={file} onChange={() => onFile(null)} />}
      <div className="flex flex-wrap gap-2">
        {["All four corners in view", "No glare or flash", "Not blurry", "Not a photocopy"].map((t) => (
          <span key={t} className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold">
            {t}
          </span>
        ))}
      </div>
      {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onBack} className={btn.outline} aria-label="Back">
          <ArrowLeft size={16} />
        </button>
        <button type="button" disabled={!file || busy} onClick={onNext} className={`${btn.dark} flex-1`}>
          Continue to selfie <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}

/** Selfie, then the smile video, with the front camera (or the phone's own camera app when it can't open here) */
function FaceSteps({
  step,
  selfie,
  video,
  onSelfie,
  onVideo,
  onBack,
  onUsePhone,
}: {
  step: "selfie" | "smile";
  selfie: File | null;
  video: File | null;
  onSelfie: (f: File) => void;
  onVideo: (f: File) => void;
  onBack: () => void;
  /** On a computer: carry on with the phone instead */
  onUsePhone?: () => void;
}) {
  const { stream, failed, retry } = useFrontCamera(true);
  const [phase, setPhase] = useState<"idle" | "ready" | "recording" | "done">(video ? "done" : "idle");
  const [ring, setRing] = useState(video ? 1 : 0);
  const [clip, setClip] = useState<File | null>(video);
  const [error, setError] = useState<string | null>(null);
  const clipUrl = useMemo(() => (clip ? URL.createObjectURL(clip) : null), [clip]);
  useEffect(() => () => {
    if (clipUrl) URL.revokeObjectURL(clipUrl);
  }, [clipUrl]);

  // The selfie: one frame from the camera (not mirrored, so it reads like the ID)
  const snap = useCallback(async () => {
    const el = document.querySelector<HTMLVideoElement>("#sotechy-face-cam video");
    if (!el || !el.videoWidth) return setError("The camera isn't ready yet. Wait a moment.");
    const canvas = document.createElement("canvas");
    canvas.width = el.videoWidth;
    canvas.height = el.videoHeight;
    canvas.getContext("2d")!.drawImage(el, 0, 0);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
    if (blob) onSelfie(new File([blob], "selfie.jpg", { type: "image/jpeg" }));
  }, [onSelfie]);

  // The smile video: "get ready", then 3 seconds of recording with "Now smile!"
  const record = () => {
    if (!stream) return;
    const type = recorderType();
    if (type === null) return setError("This browser can't record video. Open this page in Chrome or Safari.");
    setError(null);
    setClip(null);
    setPhase("ready");
    setTimeout(() => {
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        const mime = (rec.mimeType || type || "video/webm").split(";")[0];
        const blob = new Blob(chunks, { type: mime });
        setClip(new File([blob], `smile.${mime.includes("mp4") ? "mp4" : "webm"}`, { type: mime }));
        setPhase("done");
      };
      rec.start();
      setPhase("recording");
      const started = Date.now();
      const tick = setInterval(() => setRing(Math.min(1, (Date.now() - started) / (VIDEO_SECONDS * 1000))), 60);
      setTimeout(() => {
        clearInterval(tick);
        rec.stop();
      }, VIDEO_SECONDS * 1000);
    }, 1500);
  };


  // The selfie and video only ever come from the live camera here, never from a saved file
  const blocked = failed || (step === "smile" && recorderType() === null);

  return (
    <section className="flex flex-col gap-4">
      <div className="text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {step === "selfie" ? "Take a selfie" : phase === "recording" ? <span className="text-brand">Now smile!</span> : phase === "ready" ? "Get ready…" : "Smile video"}
        </h1>
        <p className="mt-1 text-ink-2">
          {step === "selfie"
            ? "Fit your face in the oval and look straight at the camera. No cap or sunglasses."
            : phase === "done"
              ? "Check it shows you smiling, then use it."
              : `Keep your face in the oval. It records for ${VIDEO_SECONDS} seconds: smile when it says so.`}
        </p>
      </div>

      {!blocked && stream && !(step === "smile" && phase === "done" && clip) && (
        <div id="sotechy-face-cam">
          <FaceCamera stream={stream} ring={step === "smile" && phase !== "idle" ? ring : undefined}>
            {step === "smile" && phase === "recording" && (
              <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-bad px-2.5 py-1 text-xs font-bold text-white">
                <span className="h-2 w-2 rounded-full bg-white" /> REC
              </span>
            )}
          </FaceCamera>
        </div>
      )}
      {!blocked && !stream && (
        <div className="flex aspect-[3/4] w-full max-w-sm items-center justify-center self-center rounded-3xl bg-panel text-sm text-white/70">
          <Loader2 size={18} className="mr-2 animate-spin" /> Opening your camera… allow it when asked
        </div>
      )}

      {step === "smile" && phase === "done" && clipUrl && (
        <video src={clipUrl} controls playsInline autoPlay muted className="mx-auto aspect-[3/4] w-full max-w-sm rounded-3xl bg-panel object-cover" />
      )}

      {blocked && (
        <div className="flex flex-col gap-3 rounded-2xl bg-warn-soft p-4 text-sm text-ink-2">
          <p className="font-semibold text-ink">{failed ? "We need your camera" : "This browser can't record video"}</p>
          <p>
            {failed
              ? "The selfie and smile video are taken live with your camera. Allow camera access for this site (in the address bar or your browser's settings), then try again."
              : "Open this page in Chrome or Safari to record the smile video."}
          </p>
          <div className="flex flex-wrap gap-2">
            {failed && (
              <button type="button" onClick={retry} className={btn.dark}>
                <RefreshCw size={16} /> Try again
              </button>
            )}
            {onUsePhone && (
              <button type="button" onClick={onUsePhone} className={btn.outline}>
                <Smartphone size={16} /> Continue on your phone
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      {!blocked && (
        <div className="flex gap-2">
          <button type="button" onClick={onBack} className={btn.outline} aria-label="Back" disabled={phase === "recording" || phase === "ready"}>
            <ArrowLeft size={16} />
          </button>
          {step === "selfie" ? (
            <button type="button" disabled={!stream} onClick={snap} className={`${btn.primary} flex-1`}>
              <Camera size={16} /> {selfie ? "Take it again" : "Take selfie"}
            </button>
          ) : phase === "done" && clip ? (
            <>
              <button type="button" onClick={record} className={btn.outline}>
                <RefreshCw size={16} /> Again
              </button>
              <button type="button" onClick={() => onVideo(clip)} className={`${btn.primary} flex-1`}>
                Use this video <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <button type="button" disabled={!stream || phase !== "idle"} onClick={record} className={`${btn.primary} flex-1`}>
              {phase === "idle" ? "Start recording" : phase === "ready" ? "Get ready…" : "Recording… keep smiling"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/** On a computer: scan to carry on with the phone (it updates here by itself once sent), or use this computer */
function PhoneOffer({ onUseComputer, onSent }: { onUseComputer: () => void; onSent: () => void }) {
  const [link, setLink] = useState<{ svg: string; url: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  const make = useCallback(async () => {
    setError(null);
    setExpired(false);
    const r = await makePhoneLink(window.location.origin);
    if ("error" in r) setError(r.error);
    else setLink(r.ok);
  }, []);

  // The first code, as soon as the page opens
  useEffect(() => {
    let live = true;
    makePhoneLink(window.location.origin).then((r) => {
      if (!live) return;
      if ("error" in r) setError(r.error);
      else setLink(r.ok);
    });
    return () => {
      live = false;
    };
  }, []);

  // Watch for the phone sending it, and for the code running out
  useEffect(() => {
    if (!link) return;
    const t = setInterval(async () => {
      if (new Date(link.expiresAt) < new Date()) setExpired(true);
      const s = await idCheckStatus();
      if (s && (s.status === "in_review" || s.status === "approved")) {
        clearInterval(t);
        onSent();
      }
    }, 4000);
    return () => clearInterval(t);
  }, [link, onSent]);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 rounded-3xl border border-line bg-surface p-6 sm:grid-cols-[1fr_auto] sm:p-8">
      <div className="flex flex-col gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft">
          <Smartphone size={24} className="text-brand-strong" />
        </span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Continue on your phone</h1>
        <p className="text-ink-2">Your phone&apos;s camera is better for the ID photo, selfie and smile video. Scan this code with it and follow the steps. This page updates by itself when you&apos;re done.</p>
        <ol className="flex flex-col gap-2 text-sm text-ink-2">
          <li>1. Open the camera on your phone</li>
          <li>2. Point it at the code and tap the link</li>
          <li>3. Do the steps there. No need to sign in.</li>
        </ol>
        <button type="button" onClick={onUseComputer} className={`${btn.outline} self-start`}>
          <Monitor size={16} /> Use this computer instead
        </button>
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex h-56 w-56 items-center justify-center rounded-3xl border border-line bg-white p-3">
          {link && !expired ? (
            // The QR code comes from our own server action (an SVG string the qrcode library made)
            <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: link.svg }} />
          ) : error ? (
            <p className="text-center text-sm text-bad">{error}</p>
          ) : expired ? (
            <button type="button" onClick={make} className={btn.dark}>
              <RefreshCw size={16} /> New code
            </button>
          ) : (
            <Loader2 size={22} className="animate-spin text-muted" />
          )}
        </div>
        <p className="flex items-center gap-2 text-xs text-muted">
          <span className="h-2 w-2 animate-pulse rounded-full bg-good" /> Waiting for your phone
        </p>
        <p className="max-w-56 text-center text-xs text-muted">The code works for 30 minutes and only once.</p>
      </div>
    </div>
  );
}
