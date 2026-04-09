"use client";

import { useState, useRef, useEffect } from "react";
import Lottie from "lottie-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Mic,
  ShieldCheck,
  Globe2,
  Database,
  CheckCircle2,
  FileAudio,
  ArrowRight,
  Info,
  Clock,
  Sparkles
} from "lucide-react";

// Ensure this file exists in the public directory
import robotAnimation from "../../public/robot-bot.json";

// --- ANIMATION VARIANTS ---
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const floatingVariant: Variants = {
  animate: {
    y: [-5, 5, -5],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const pulseGlowVariant: Variants = {
  animate: {
    boxShadow: [
      "0px 0px 0px 0px rgba(139, 92, 246, 0.4)",
      "0px 0px 20px 10px rgba(139, 92, 246, 0.2)",
      "0px 0px 0px 0px rgba(139, 92, 246, 0.4)"
    ],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
  }
};

export default function AudioRecorderPage() {
  // --- CORE SYSTEM STATE ---
  const [userName, setUserName] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  // --- UX STATE (Highlighting Recorder) ---
  const [isRecorderHighlighted, setIsRecorderHighlighted] = useState<boolean>(false);

  // --- REFS ---
  const recorderSectionRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- TIMER LOGIC ---
  const formatTime = (totalSeconds: number) => {
    const min = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const sec = (totalSeconds % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  // --- SMOOTH SCROLL UX ---
  const scrollToRecorder = () => {
    // Scroll Into View
    recorderSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

    // Add glowing highlight effect for 2 seconds
    setIsRecorderHighlighted(true);
    setTimeout(() => setIsRecorderHighlighted(false), 2000);

    // Auto-focus the input name field
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 500); // slight delay to allow smooth scrolling to settle
  };

  // --- RECORDING LOGIC (Untouched per constraints) ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = uploadRecording;

      mediaRecorder.start();
      setIsRecording(true);
      setUploadStatus("");
      setRecordingSeconds(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required to record audio.");
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const uploadRecording = async () => {
    setUploadStatus("Uploading privately to secure server...");
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("name", userName);

    try {
      const response = await fetch(`/api/proxy/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setUploadStatus("Upload Successful! 🎉 Thank you for contributing.");
      } else {
        const errorData = await response.json();
        setUploadStatus(`Upload Failed: ${errorData.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadStatus("Upload Failed: Network Error.");
    }
  };

  return (
    <div className="min-h-screen bg-[#06080F] text-slate-100 font-sans overflow-x-hidden selection:bg-purple-500/30">

      {/* GLOBAL BACKGROUND EFFECTS */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[150px] rounded-full mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[150px] rounded-full mix-blend-screen"></div>
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-cyan-900/10 blur-[120px] rounded-full mix-blend-screen"></div>
      </div>

      {/* --- FLOATING STICKY CTA --- */}
      <motion.button
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        onClick={scrollToRecorder}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 rounded-full font-semibold shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95 transition-all md:hidden"
      >
        <Mic className="w-5 h-5 text-white" />
        Record
      </motion.button>

      {/* --- CONTENT CONTAINER --- */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 flex flex-col gap-24">

        {/* --- 1. HERO SECTION --- */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="flex flex-col items-center text-center mt-12 gap-6"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 backdrop-blur-md">
            <Globe2 className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-slate-300">Supports all languages globally</span>
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Help Improve Speech AI <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              With Your Unique Voice
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-lg text-slate-400 max-w-2xl leading-relaxed">
            Record a fast, 5-second descriptive sentence about a payment transaction in your native language. Your completely anonymous clips fine-tune the next generation of financial AI.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-4 w-56 h-56 relative -z-10 group">
             {/* Glowing aura behind robot */}
             <div className="absolute inset-0 bg-blue-500/20 blur-[60px] rounded-full group-hover:bg-purple-500/30 transition-colors duration-700"></div>
             <motion.div variants={floatingVariant} animate="animate">
               <Lottie animationData={robotAnimation} loop={true} />
             </motion.div>
          </motion.div>

          <motion.button
            variants={fadeUp}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={scrollToRecorder}
            className="group relative px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold text-lg overflow-hidden mt-2"
          >
            <motion.div variants={pulseGlowVariant} animate="animate" className="absolute inset-0 rounded-2xl"></motion.div>
            <span className="relative z-10 flex items-center gap-3">
              Start Recording <Mic className="w-5 h-5 group-hover:animate-pulse" />
            </span>
          </motion.button>
        </motion.section>

        {/* --- 2. EXAMPLE SECTION --- */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="relative max-w-4xl mx-auto w-full"
        >
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] pointer-events-none"></div>

            <div className="flex flex-col mb-8 text-center sm:text-left">
              <h2 className="text-3xl font-bold flex items-center justify-center sm:justify-start gap-3">
                🎙️ What should I say?
              </h2>
              <p className="text-slate-400 text-base mt-2">Just describe a payment. Speak naturally in your own style.</p>
            </div>

            <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-6">
              <p className="text-slate-300 text-sm font-semibold tracking-wide mb-4 flex items-center gap-2">
                💡 Examples (for understanding)
              </p>

              <motion.ul variants={staggerContainer} className="space-y-3">
                {[
                  "Aaj maine Trump se 100 rupaye liye.",
                  "Kal maine 200 rupees bank me transfer kiye the.",
                  "I paid Rahul 500 rupees for dinner at the restaurant.",
                  "Yesterday, I had a cold coffee for 70 rupees.",
                  "Aaj mne Modi ko chai ke 20 rupe bheje.",
                  "Aaj manne 500 rupaye ka ghee liya.",
                  "Aaj humke 700 rupaye dihaadi mili."
                ].map((text, idx) => (
                  <motion.li
                    key={idx}
                    variants={fadeUp}
                    className="p-3 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-700/50"
                  >
                    <span className="text-lg font-medium text-slate-200">“{text}”</span>
                  </motion.li>
                ))}
              </motion.ul>
            </div>

            <p className="text-slate-400 text-sm mt-6 text-center sm:text-left leading-relaxed font-medium">
              🌍 You can speak in any language or accent — Hindi, English, Hinglish, or your local dialect.
            </p>
          </div>
        </motion.section>

        {/* --- 3. INSTRUCTIONS & TRUST COMBINED SECTION --- */}
        <section className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full">
          {/* Instructions */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
            className="flex flex-col gap-6"
          >
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-2">
              <Info className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-bold">Best Practices</h3>
            </motion.div>

            {[
              { icon: FileAudio, title: "Natural Tone", desc: "Speak exactly how you normally would with a friend. No need to act robotic." },
              { icon: Clock, title: "Keep it short", desc: "5 to 10 seconds is the perfect length. We only need brief transaction descriptions." },
              { icon: Mic, title: "Minimize Noise", desc: "Try to record in a somewhat quiet room so the AI can isolate your words beautifully." }
            ].map((rule, idx) => (
              <motion.div key={idx} variants={fadeUp} className="flex gap-4">
                <div className="mt-1 flex-shrink-0 p-2 bg-slate-800/50 rounded-lg text-blue-400">
                  <rule.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-200">{rule.title}</h4>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">{rule.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Security & Trust */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
            className="flex flex-col gap-6 bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800/50"
          >
            <motion.div variants={fadeUp}>
              <h3 className="text-xl font-bold">Enterprise Privacy</h3>
              <p className="text-sm text-slate-400 mt-2 line-clamp-2">Your data is treated with maximal cryptographic transit security.</p>
            </motion.div>

            {[
              { icon: ShieldCheck, title: "Securely Handled", text: "End-to-End TLS encrypted transit pipeline directly to enterprise storage grids." },
              { icon: Database, title: "Strict Engine Access", text: "Your voice is used strictly to fine-tune linguistic parsing models." },
              { icon: CheckCircle2, title: "Zero Public Sharing", text: "You remain totally anonymous. Recordings are entirely walled-off." }
            ].map((trust, idx) => (
              <motion.div key={idx} variants={fadeUp} className="flex items-center gap-4 group">
                <div className="p-3 bg-slate-800 rounded-xl group-hover:bg-purple-500/20 transition-all border border-transparent group-hover:border-purple-500/30">
                  <trust.icon className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-slate-200">{trust.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{trust.text}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* --- 4. STEP FLOW INDICATOR --- */}
        <motion.section
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="max-w-3xl mx-auto w-full py-8 border-y border-slate-800/60"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 relative">
            {/* Background dashed line */}
            <div className="hidden md:block absolute top-[50%] left-0 w-full border-t-2 border-dashed border-slate-800 -z-10"></div>

            {[
              { step: 1, title: "Read & Prep" },
              { step: 2, title: "Identify Yourself" },
              { step: 3, title: "Record & Send" }
            ].map((s, idx) => (
              <div key={idx} className="flex flex-col items-center gap-3 bg-[#06080F] px-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-800 border-2 border-slate-700 text-sm font-bold text-slate-300">
                  {s.step}
                </div>
                <p className="text-sm font-medium text-slate-400">{s.title}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* --- 5. RECORDER SECTION (Core App Component) --- */}
        <motion.section
          ref={recorderSectionRef}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className={`relative max-w-2xl mx-auto w-full bg-slate-900/80 backdrop-blur-2xl border ${isRecorderHighlighted ? 'border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.4)]' : 'border-slate-700/60 shadow-2xl'} rounded-[2rem] p-8 md:p-12 transition-all duration-700`}
        >
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-3xl font-bold bg-white bg-clip-text text-transparent">VocalVault</h2>
            <p className="text-slate-400 text-sm">⏱️ Takes only 5 seconds. Secure and direct.</p>
          </div>

          <div className="space-y-10">
            {/* Identification Layer */}
            <div className="space-y-3">
              <label htmlFor="name" className="block text-sm font-semibold text-slate-300">
                Authorized Submitter ID (Your Name)
              </label>
              <input
                ref={nameInputRef}
                id="name"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                autoComplete="off"
                className="w-full px-5 py-4 rounded-xl bg-slate-950 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-slate-600 text-lg"
                placeholder="e.g. AMBANI"
              />
            </div>

            {/* Visual Separation */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>

            {/* Interaction Layer */}
            <div className="flex flex-col items-center justify-center space-y-8 min-h-[200px]">
              <AnimatePresence mode="wait">
                {!userName.trim() ? (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center gap-3 text-slate-500"
                  >
                    <ArrowRight className="w-8 h-8 opacity-50" />
                    <p className="text-sm font-medium">Identify yourself above to unlock recording</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="active"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center w-full"
                  >
                    {isRecording ? (
                      <div className="relative group">
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                        <button
                          onClick={stopRecording}
                          className="relative flex items-center justify-center w-32 h-32 bg-red-500 rounded-full shadow-2xl shadow-red-500/40 hover:bg-red-400 transition-transform active:scale-95"
                        >
                          <div className="w-10 h-10 bg-white rounded-sm"></div>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={startRecording}
                        disabled={!!uploadStatus && !uploadStatus.includes('Failed')}
                        className="relative flex items-center justify-center w-32 h-32 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full shadow-2xl shadow-blue-500/40 hover:shadow-cyan-500/50 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed group"
                      >
                        <div className="absolute inset-0 rounded-full border-4 border-white/20 group-hover:border-white/40 transition-colors"></div>
                        <Mic className="w-12 h-12 text-white" />
                      </button>
                    )}

                    <div className="h-16 flex flex-col items-center mt-6">
                      <p className={`font-medium tracking-wide ${isRecording ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>
                        {isRecording ? "🔴 Capturing Audio Phase..." : "Tap the sphere to record"}
                      </p>
                      {isRecording && (
                        <p className="text-3xl mt-1 font-mono text-white tracking-widest tabular-nums font-bold">
                          {formatTime(recordingSeconds)}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Status Readout */}
              <AnimatePresence>
                {uploadStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 w-full text-center rounded-xl text-sm font-medium ${uploadStatus.includes('Successful') ? 'bg-green-500/10 text-green-400 border border-green-500/30' : uploadStatus.includes('Failed') ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'}`}
                  >
                    {uploadStatus}
                    {uploadStatus.includes('Successful') && (
                      <div className="mt-3">
                        <button
                          onClick={() => { setUploadStatus(""); setUserName(""); }}
                          className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors inline-block font-semibold"
                        >
                          Submit New Entry
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        {/* Footer padding spacer */}
        <div className="h-12"></div>
      </div>
    </div>
  );
}
