import { useState } from "react";

interface Props {
  onClose: () => void;
}

export function ContactPage({ onClose }: Props) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type: "bug",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send the data to a backend
    console.log("Form submitted:", formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", type: "bug", message: "" });
      onClose();
    }, 2000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Contact & Support</h2>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300">Get in Touch</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-violet-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Email</p>
              <p className="text-sm text-zinc-300">contact@imagify.app</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-violet-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4.243 4.243a4 4 0 105.656 5.656l4.243-4.243m0-5.656a4 4 0 015.656 0l4.243-4.243a4 4 0 00-5.656-5.656l-4.243 4.243"
              />
            </svg>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Website</p>
              <p className="text-sm text-violet-400 hover:text-violet-300 cursor-pointer">
                imagify.app
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-violet-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">GitHub</p>
              <p className="text-sm text-violet-400 hover:text-violet-300 cursor-pointer">
                github.com/imagify
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-zinc-800/60" />

      {/* Report Issue Form */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300">Report an Issue</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-1.5">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full rounded-lg bg-zinc-800/50 border border-zinc-700/60 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-500/60 transition-colors"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-1.5">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg bg-zinc-800/50 border border-zinc-700/60 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-500/60 transition-colors"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-1.5">
              Issue Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full rounded-lg bg-zinc-800/50 border border-zinc-700/60 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-violet-500/60 transition-colors"
            >
              <option value="bug">Report a Bug</option>
              <option value="feature">Feature Request</option>
              <option value="feedback">General Feedback</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-1.5">
              Message
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={4}
              className="w-full rounded-lg bg-zinc-800/50 border border-zinc-700/60 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-500/60 transition-colors resize-none scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
              placeholder="describe the issue or feature request..."
            />
          </div>

          <button
            type="submit"
            disabled={submitted}
            className={`w-full rounded-lg px-4 py-2.5 text-xs font-semibold transition-all duration-200 ${
              submitted
                ? "bg-green-600/20 text-green-400 border border-green-600/30"
                : "bg-violet-600 hover:bg-violet-500 text-white border border-violet-500"
            }`}
          >
            {submitted ? "✓ Message Sent" : "Send Message"}
          </button>
        </form>
      </div>

      {/* Additional Info */}
      <div className="rounded-lg bg-zinc-800/30 border border-zinc-700/30 p-3.5">
        <p className="text-xs text-zinc-400 leading-relaxed">
          Thank you for using Imagify! We appreciate your feedback and bug reports. Our team will get back to you as soon as possible.
        </p>
      </div>
    </div>
  );
}
