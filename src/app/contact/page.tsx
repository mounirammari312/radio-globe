"use client";

import { useState } from "react";
import Link from "next/link";
import { Globe2, ArrowLeft, Mail, Send, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // Simulate sending — replace with real form backend (e.g. Formspree, Netlify Forms)
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    }, 800);
  };

  return (
    <main className="min-h-screen bg-[#040810] text-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Radio Globe
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
            <Globe2 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">Contact Us</h1>
        </div>

        <p className="text-white/70 mb-8 leading-relaxed">
          Have a question, suggestion, or want to report a broken station? We&apos;d
          love to hear from you. Fill out the form below and we&apos;ll get back to
          you as soon as possible.
        </p>

        {sent ? (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6 mb-8">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-emerald-300 mb-1">
                  Thanks — your message has been sent!
                </h2>
                <p className="text-sm text-white/70">
                  We&apos;ll reply within a few days. If your matter is urgent
                  (e.g. an offensive station), please also report it directly
                  to the{" "}
                  <a
                    href="https://www.radio-browser.info/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline"
                  >
                    Radio Browser community
                  </a>
                  .
                </p>
              </div>
            </div>
            <button
              onClick={() => setSent(false)}
              className="mt-4 text-sm text-emerald-400 hover:text-emerald-300 underline"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm text-white/70 font-medium">
                  Your name
                </label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm text-white/70 font-medium">
                  Your email
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="subject" className="text-sm text-white/70 font-medium">
                Subject
              </label>
              <Input
                id="subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Reporting a broken station / Question / Feedback…"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="text-sm text-white/70 font-medium">
                Message
              </label>
              <Textarea
                id="message"
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind…"
                rows={6}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 resize-y"
              />
            </div>

            <Button
              type="submit"
              disabled={sending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 h-auto"
            >
              {sending ? (
                <>
                  <span className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        )}

        <div className="mt-12 pt-8 border-t border-white/10">
          <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-400" />
            Other ways to reach us
          </h2>
          <ul className="text-sm text-white/60 space-y-1.5">
            <li>
              Open a bug or feature request on our{" "}
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                GitHub repository
              </a>
            </li>
            <li>
              For data corrections (broken stream URLs, station info), report
              directly to{" "}
              <a
                href="https://www.radio-browser.info/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                Radio Browser API
              </a>
            </li>
          </ul>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-sm text-white/40 flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/privacy-policy" className="text-emerald-400 hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-emerald-400 hover:underline">
            Terms of Use
          </Link>
          <Link href="/about" className="text-emerald-400 hover:underline">
            About
          </Link>
        </div>
      </div>
    </main>
  );
}
