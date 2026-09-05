import React, { useState } from 'react';
import { ShieldCheck, AlertOctagon, Scale, Mail, FileText, CheckCircle2 } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export const TermsPage: React.FC = () => (
  <div className="max-w-3xl mx-auto space-y-6 py-6 text-zinc-300">
    <div className="pb-4 border-b border-white/10">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Scale className="w-6 h-6 text-amber-400" />
        Terms of Service
      </h1>
      <p className="text-xs text-zinc-400 mt-1">Last Updated: September 2025</p>
    </div>

    <section className="space-y-3">
      <h2 className="text-base font-bold text-white">1. Acceptance of Terms</h2>
      <p className="text-xs leading-relaxed text-zinc-300">
        By accessing or uploading media to StreamSphere, you agree to be bound by these Terms of Service. If you do not agree to these terms, you must discontinue platform use immediately.
      </p>
    </section>

    <section className="space-y-3">
      <h2 className="text-base font-bold text-white">2. Creator Rights & Content Ownership</h2>
      <p className="text-xs leading-relaxed text-zinc-300">
        Creators retain full ownership and intellectual property rights to the videos they upload. By submitting content to StreamSphere, you grant us a worldwide, non-exclusive, royalty-free license to host, transcode, cache, and distribute the media via Bunny Stream CDN solely for the purpose of platform operation.
      </p>
    </section>

    <section className="space-y-3">
      <h2 className="text-base font-bold text-white">3. Lawful & Consensual Content Guarantee</h2>
      <p className="text-xs leading-relaxed text-zinc-300">
        You explicitly affirm and warrant that any media uploaded by your account contains only lawful and consensual content. You certify that you hold all required copyright permissions, mechanical licenses, model releases, and approvals from all identifiable individuals appearing in your streams.
      </p>
    </section>

    <section className="space-y-3">
      <h2 className="text-base font-bold text-white">4. Prohibited Conduct</h2>
      <p className="text-xs leading-relaxed text-zinc-300">
        StreamSphere strictly forbids: copyrighted piracy, non-consensual media, unauthorized scraping, hate speech, violent extremism, malicious impersonation, and fraudulent spam. Violation will result in immediate permanent account termination and referral to law enforcement where required by law.
      </p>
    </section>
  </div>
);

export const PrivacyPage: React.FC = () => (
  <div className="max-w-3xl mx-auto space-y-6 py-6 text-zinc-300">
    <div className="pb-4 border-b border-white/10">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-emerald-400" />
        Privacy & Data Security Policy
      </h1>
      <p className="text-xs text-zinc-400 mt-1">Last Updated: September 2025</p>
    </div>

    <section className="space-y-3">
      <h2 className="text-base font-bold text-white">1. Information We Collect</h2>
      <p className="text-xs leading-relaxed text-zinc-300">
        StreamSphere collects basic profile credentials (email, handle, display name) and video metadata to power your playback and channel experience. We do not sell personal data to advertisers.
      </p>
    </section>

    <section className="space-y-3">
      <h2 className="text-base font-bold text-white">2. Video Delivery & Edge Caching</h2>
      <p className="text-xs leading-relaxed text-zinc-300">
        Video streams are encoded, transcoded, and served via Bunny Stream global edge nodes. Anonymized IP telemetry is used strictly for view deduplication and DDoS prevention.
      </p>
    </section>

    <section className="space-y-3">
      <h2 className="text-base font-bold text-white">3. Data Deletion & Export</h2>
      <p className="text-xs leading-relaxed text-zinc-300">
        You have the complete right to erase your account, uploaded streams, and interaction history at any time through the Creator Studio dashboard.
      </p>
    </section>
  </div>
);

export const DmcaPage: React.FC = () => {
  const { showToast } = useNotification();
  const [submitted, setSubmitted] = useState(false);
  const [workTitle, setWorkTitle] = useState('');
  const [url, setUrl] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [statement, setStatement] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    showToast({
      type: 'success',
      title: 'Takedown Notice Received',
      message: 'Our designated DMCA copyright agent has received your sworn notice.',
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6 text-zinc-300">
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <AlertOctagon className="w-6 h-6 text-rose-400" />
          DMCA / Copyright Takedown Policy
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          StreamSphere respects intellectual property rights and acts expeditiously to remove infringing material.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 text-xs leading-relaxed space-y-2 text-zinc-300 shadow-md">
        <p>
          In accordance with the Digital Millennium Copyright Act (17 U.S.C. § 512), StreamSphere has instituted a clear policy to terminate the accounts of repeat copyright infringers. If you believe your copyrighted work is being infringed on StreamSphere, please submit a formal notice below.
        </p>
      </div>

      {submitted ? (
        <div className="p-8 rounded-3xl bg-[#0a0a0a] border border-white/10 text-center space-y-3 shadow-xl">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Notice Successfully Logged</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Our legal compliance team reviews notices in accordance with 17 U.S.C. § 512(c). The contested video has been flagged for immediate administrator inspection.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-[#0a0a0a] border border-white/10 space-y-4 text-xs shadow-xl">
          <h2 className="text-sm font-bold text-white">DMCA Takedown Notification Form</h2>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Copyrighted Work Description</label>
            <input
              type="text"
              value={workTitle}
              onChange={(e) => setWorkTitle(e.target.value)}
              placeholder="e.g. Original musical recording, cinematography project, or broadcast"
              className="w-full h-10 px-3 rounded-xl bg-[#050505] border border-white/10 text-white focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Infringing StreamSphere URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://streamsphere.live/watch/video-slug"
              className="w-full h-10 px-3 rounded-xl bg-[#050505] border border-white/10 text-white focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Copyright Holder / Agent Contact Info</label>
            <input
              type="text"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="Full legal name, organization, mailing address, email, and phone"
              className="w-full h-10 px-3 rounded-xl bg-[#050505] border border-white/10 text-white focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Good Faith Statement & Digital Signature</label>
            <textarea
              rows={4}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="State under penalty of perjury that you are the copyright holder or authorized to act on behalf of the owner..."
              className="w-full p-3 rounded-xl bg-[#050505] border border-white/10 text-white focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg shadow-rose-600/20 cursor-pointer uppercase tracking-wider"
          >
            Submit Official DMCA Notice
          </button>
        </form>
      )}
    </div>
  );
};

export const GuidelinesPage: React.FC = () => (
  <div className="max-w-3xl mx-auto space-y-6 py-6 text-zinc-300">
    <div className="pb-4 border-b border-white/10">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <FileText className="w-6 h-6 text-amber-400" />
        Community Guidelines
      </h1>
      <p className="text-xs text-zinc-400 mt-1">Our principles for a lawful, respectful, and safe creator platform.</p>
    </div>

    <div className="space-y-4 text-xs leading-relaxed">
      <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-1 shadow-md">
        <h3 className="font-bold text-white text-sm">1. Strict Zero-Tolerance for Stolen & Pirated Media</h3>
        <p className="text-zinc-400">
          StreamSphere is designed for lawful, consensual, user-created streams. Do not re-upload movies, television series, sporting events, or music without explicit authorization.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-1 shadow-md">
        <h3 className="font-bold text-white text-sm">2. Non-Consensual Imagery is Barred</h3>
        <p className="text-zinc-400">
          Any content depicting individuals without their documented consent, intimacy without consent, or doxxing will result in immediate permanent banning and notification to proper authorities.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-1 shadow-md">
        <h3 className="font-bold text-white text-sm">3. Age Gating Compliance</h3>
        <p className="text-zinc-400">
          Creators uploading mature discussions or artistic adult-rated content must check the "18+ Age Restriction" flag during the upload process to prevent unauthorized minor viewing.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-1 shadow-md">
        <h3 className="font-bold text-white text-sm">4. Respectful Discussion</h3>
        <p className="text-zinc-400">
          Engage constructively in video comments. Threatening language, hate speech, or harassment directed at any creator or community member is disallowed.
        </p>
      </div>
    </div>
  </div>
);

export const ContactPage: React.FC = () => {
  const { showToast } = useNotification();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    showToast({ type: 'success', title: 'Message Sent', message: 'StreamSphere Trust & Safety will respond shortly.' });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 py-6">
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Mail className="w-6 h-6 text-amber-400" />
          Contact & Abuse Response
        </h1>
        <p className="text-xs text-zinc-400 mt-1">Reach out to our platform engineering and trust team.</p>
      </div>

      {submitted ? (
        <div className="p-8 rounded-3xl bg-[#0a0a0a] border border-white/10 text-center space-y-3 shadow-xl">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Message Received</h3>
          <p className="text-xs text-zinc-400">Our engineering and moderation team will respond via email.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-[#0a0a0a] border border-white/10 space-y-4 text-xs shadow-xl">
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Your Name</label>
            <input type="text" required className="w-full h-10 px-3 rounded-xl bg-[#050505] border border-white/10 text-white focus:outline-none focus:border-amber-400" />
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Email Address</label>
            <input type="email" required className="w-full h-10 px-3 rounded-xl bg-[#050505] border border-white/10 text-white focus:outline-none focus:border-amber-400" />
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Subject</label>
            <select className="w-full h-10 px-3 rounded-xl bg-[#050505] border border-white/10 text-white focus:outline-none focus:border-amber-400">
              <option>General Inquiries</option>
              <option>Creator Partner Program</option>
              <option>Security & Abuse Report</option>
              <option>Bunny Stream API Integration Inquiry</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Message</label>
            <textarea rows={4} required className="w-full p-3 rounded-xl bg-[#050505] border border-white/10 text-white focus:outline-none focus:border-amber-400" />
          </div>

          <button type="submit" className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 cursor-pointer">
            Send Message
          </button>
        </form>
      )}
    </div>
  );
};
