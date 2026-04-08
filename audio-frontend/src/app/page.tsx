"use client";

import { useState, useRef } from "react";

export default function AudioRecorderPage() {
  const [step, setStep] = useState<number>(1);
  const [userName, setUserName] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (totalSeconds: number) => {
    const min = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const sec = (totalSeconds % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  // Handlers for Step 1
  const acceptTerms = () => setStep(2);

  // Handlers for Step 2
  const submitName = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim().length > 0) {
      setStep(3);
    }
  };

  // Handlers for Step 3
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
      // Stop all microphone tracks to release the hardware
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const uploadRecording = async () => {
    setUploadStatus("Uploading to secure server...");
    // Force webm for maximum browser compatibility without transcoding overhead
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("name", userName);

    try {
      // In production (Vercel), we hit the Next.js internal rewriting proxy.
      // This permanently bypasses the browser's CORS locks because the request becomes Same-Origin!
      const response = await fetch(`/api/proxy/upload`, {
        method: "POST",
        body: formData, // the browser automatically sets the correct multipart boundary
      });

      if (response.ok) {
        setUploadStatus("Upload Successful! 🎉");
      } else {
        const errorData = await response.json();
        setUploadStatus(`Upload Failed: ${errorData.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadStatus("Upload Failed: Network Error or CORS issue.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 selection:bg-blue-500/30">
      <main className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 md:p-12">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-blue-500/10 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Voice Data Collection
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Help improve future speech models.</p>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-semibold border-b border-slate-800 pb-3 flex items-center gap-2">
              <span className="text-blue-500">1.</span> Terms & Conditions
            </h2>
            <div className="bg-slate-950/50 border border-slate-800/50 p-5 rounded-xl text-sm text-slate-300 space-y-4">
              <p>By using this platform, you agree to the following:</p>
              <ul className="list-disc pl-5 space-y-2 text-slate-400">
                <li>Your audio recording will be securely stored.</li>
                <li>The data will be used for research and machine learning model improvement.</li>
                <li>Your recordings may be used to fine-tune AI models in the future.</li>
                <li>The purpose is to improve systems that convert natural speech into structured data.</li>
                <li>Your data will not be shared publicly or misused.</li>
              </ul>
              <p className="font-medium text-blue-400 pt-2">By proceeding, you consent to this usage.</p>
            </div>
            <button
              onClick={acceptTerms}
              className="w-full py-3.5 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]"
            >
              I Agree & Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={submitName} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-xl font-semibold border-b border-slate-800 pb-3 flex items-center gap-2">
              <span className="text-blue-500">2.</span> Identification
            </h2>
            <p className="text-sm text-slate-400">Please enter your name to associate your recordings securely.</p>
            <div className="py-2">
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
                className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g. Rahul Gupta"
              />
            </div>
            <button
              type="submit"
              disabled={!userName.trim()}
              className="w-full py-3.5 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed hover:disabled:scale-100 active:scale-[0.98]"
            >
              Start Recording Phase
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="space-y-10 flex flex-col items-center py-6 animate-in fade-in duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Ready, {userName}?</h2>
              <p className="text-sm text-slate-400 max-w-sm">
                Speak naturally. Describe a sample transaction statement when prompted.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-8 w-full">
              {isRecording ? (
                <div className="relative group">
                  <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                  <button
                    onClick={stopRecording}
                    className="relative flex items-center justify-center w-28 h-28 bg-red-500 rounded-full shadow-xl shadow-red-500/30 hover:bg-red-400 transition-transform active:scale-95"
                  >
                    <div className="w-8 h-8 bg-white rounded-sm"></div>
                  </button>
                </div>
              ) : (
                <button
                  onClick={startRecording}
                  disabled={!!uploadStatus && !uploadStatus.includes('Failed')}
                  className="relative flex items-center justify-center w-28 h-28 bg-blue-600 rounded-full shadow-xl shadow-blue-500/30 hover:bg-blue-500 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <svg className="w-12 h-12 text-white ml-1" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z"></path></svg>
                </button>
              )}
              
              <div className="h-14 flex flex-col items-center">
                 <p className={`font-medium tracking-wide ${isRecording ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
                    {isRecording ? "🔴 Recording in progress..." : "Tap to record"}
                 </p>
                 {isRecording && (
                   <p className="text-2xl mt-1 font-mono text-white tracking-widest tabular-nums font-bold">
                     {formatTime(recordingSeconds)}
                   </p>
                 )}
              </div>
            </div>

            {uploadStatus && (
              <div className={`p-4 w-full text-center rounded-xl text-sm font-medium animate-in slide-in-from-bottom-2 ${uploadStatus.includes('Successful') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : uploadStatus.includes('Failed') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                {uploadStatus}
              </div>
            )}
            
            {uploadStatus.includes('Successful') && (
              <button 
                onClick={() => { setUploadStatus(""); setStep(2); }}
                className="text-sm font-medium text-slate-400 hover:text-white border-b border-transparent hover:border-white transition-all pb-0.5"
                >
                Record another clip
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
