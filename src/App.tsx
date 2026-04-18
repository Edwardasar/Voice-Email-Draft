import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Copy, RotateCcw, Check, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { transformVoiceNote } from './services/gemini';

// Type definitions for Speech Recognition
interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

export default function App() {
  const [roughDraft, setRoughDraft] = useState('');
  const [polishedEmail, setPolishedEmail] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setRoughDraft((prev) => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + finalTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (e) {
          console.error("Failed to start recognition", e);
        }
      } else {
        alert('Speech recognition is not supported in this browser.');
      }
    }
  };

  const handleTransform = async () => {
    if (!roughDraft.trim()) return;
    setIsProcessing(true);
    const result = await transformVoiceNote(roughDraft);
    setPolishedEmail(result);
    setIsProcessing(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(polishedEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetAll = () => {
    setRoughDraft('');
    setPolishedEmail('');
    setCopied(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 flex flex-col items-center">
      <header className="w-full max-w-4xl mb-8 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-2"
        >
          <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <MessageSquare size={28} />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-teal-900">
            Comm<span className="text-teal-600">Polisher</span>
          </h1>
        </motion.div>
        <p className="text-slate-500 text-center max-w-md mt-2">
          Elevate your informal thoughts into high-impact corporate emails instantly.
        </p>
      </header>

      <main className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Input Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-widest text-teal-800">
              Your Thoughts
            </h2>
            {roughDraft && (
              <button 
                onClick={() => setRoughDraft('')}
                className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                title="Clear input"
              >
                <RotateCcw size={12} /> Clear
              </button>
            )}
          </div>
          
          <div className="relative group">
            <textarea
              value={roughDraft}
              onChange={(e) => setRoughDraft(e.target.value)}
              placeholder="Start typing or click the mic to record a voice note..."
              className="w-full h-[450px] p-6 bg-white border border-slate-200 rounded-3xl shadow-sm focus:ring-4 focus:ring-teal-100 focus:border-teal-500 outline-none transition-all resize-none text-slate-700 leading-relaxed text-lg"
            />
            
            {/* Control Bar inside the textarea container */}
            <div className="absolute bottom-6 right-6 flex items-center gap-3">
              <button
                onClick={toggleListening}
                className={`flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 shadow-xl active:scale-95 ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-100' 
                    : 'bg-teal-50 hover:bg-teal-100 text-teal-600 border border-teal-200 hover:scale-105'
                }`}
                title={isListening ? "Stop listening" : "Start voice note"}
              >
                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              </button>

              <button
                onClick={handleTransform}
                disabled={!roughDraft.trim() || isProcessing}
                className={`flex items-center gap-2 pr-8 pl-6 h-14 rounded-full font-bold transition-all shadow-xl active:scale-95 ${
                  isProcessing 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105'
                }`}
              >
                {isProcessing ? (
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  </div>
                ) : (
                  <>
                    <span>Polished</span>
                    <Send size={20} className="mt-0.5" />
                  </>
                )}
              </button>
            </div>
            
            {isListening && (
              <div className="absolute top-6 right-6">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Output Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1 h-7">
            <h2 className="text-sm font-bold uppercase tracking-widest text-teal-800">
              Professional Transformation
            </h2>
            <AnimatePresence>
              {polishedEmail && (
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={copyToClipboard}
                  className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full transition-all shadow-sm ${
                    copied 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-white border border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-600'
                  }`}
                >
                  {copied ? (
                    <><Check size={14} /> Copied to Clipboard</>
                  ) : (
                    <><Copy size={14} /> Copy to Clipboard</>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="h-[450px] bg-white border border-slate-200 rounded-3xl shadow-sm p-8 overflow-auto text-slate-800 leading-relaxed font-sans relative group">
            {!polishedEmail && !isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 p-8 text-center animate-pulse">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <MessageSquare size={40} className="text-slate-200" />
                </div>
                <p className="text-slate-400 font-medium">Capture your ideas on the left and see them shine here.</p>
              </div>
            )}
            
            {isProcessing && (
              <div className="space-y-6 mt-4">
                <div className="h-4 bg-slate-100 rounded w-1/3 animate-pulse"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-slate-100 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-slate-100 rounded w-11/12 animate-pulse"></div>
                  <div className="h-4 bg-slate-100 rounded w-full animate-pulse"></div>
                </div>
                <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded w-1/4 animate-pulse"></div>
              </div>
            )}

            {polishedEmail && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="whitespace-pre-wrap text-lg"
              >
                {polishedEmail}
              </motion.div>
            )}
          </div>
          
          <div className="flex justify-center mt-2 opacity-50 hover:opacity-100 transition-opacity">
            <button
              onClick={resetAll}
              className="text-xs font-bold text-slate-400 hover:text-teal-600 px-4 py-2 rounded-lg transition-all flex items-center gap-2 uppercase tracking-widest"
            >
              <RotateCcw size={14} /> Reset Workspace
            </button>
          </div>
        </section>
      </main>

      <footer className="mt-auto py-12 text-slate-400 text-xs flex flex-col items-center gap-4">
        <div className="flex gap-8">
          <span className="font-semibold uppercase tracking-tighter text-slate-300">CommPolisher Pro</span>
          <a href="#" className="hover:text-teal-600 transition-colors uppercase tracking-widest px-1">Privacy Protocol</a>
          <a href="#" className="hover:text-teal-600 transition-colors uppercase tracking-widest px-1">Support Center</a>
        </div>
      </footer>
    </div>
  );
}
