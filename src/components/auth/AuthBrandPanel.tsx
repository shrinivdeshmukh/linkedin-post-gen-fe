const testimonials = [
  {
    quote:
      "Postcards helped me go from posting once a month to three times a week — without sacrificing quality.",
    name: "Sarah Chen",
    title: "Chief Product Officer",
  },
  {
    quote:
      "My team drafts, I approve in two clicks. It's the workflow I didn't know I needed.",
    name: "Marcus Webb",
    title: "CEO, Series B",
  },
  {
    quote:
      "The AI actually sounds like me. That's rare.",
    name: "Priya Nair",
    title: "CTO & Co-founder",
  },
];

// Simple deterministic pick based on time-of-day slot
const testimonial = testimonials[Math.floor(Date.now() / 8_000_000) % testimonials.length];

export function AuthBrandPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between h-full bg-slate-900 text-white p-12 relative overflow-hidden">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Glow accents */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600 rounded-full blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-violet-600 rounded-full blur-3xl opacity-15 pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10">
        <PostcardsLogo />
      </div>

      {/* Center content */}
      <div className="relative z-10 space-y-6">
        <div className="space-y-2">
          <p className="text-indigo-400 text-sm font-medium tracking-widest uppercase">
            Your voice. Delivered.
          </p>
          <h2 className="text-4xl font-bold leading-tight text-white">
            LinkedIn presence,
            <br />
            <span className="text-indigo-400">without the effort.</span>
          </h2>
        </div>

        <p className="text-slate-400 text-base leading-relaxed max-w-sm">
          AI-powered drafts in your voice. Team workflows built for busy executives.
          Publish when it matters most.
        </p>

        {/* Stats */}
        <div className="flex gap-8 pt-2">
          {[
            { value: "3×", label: "more posts" },
            { value: "60s", label: "avg. draft time" },
            { value: "100%", label: "your voice" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonial */}
      <div className="relative z-10 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <svg className="w-6 h-6 text-indigo-400 mb-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
        <p className="text-slate-300 text-sm leading-relaxed italic">
          "{testimonial.quote}"
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/30 flex items-center justify-center text-indigo-300 text-xs font-bold">
            {testimonial.name[0]}
          </div>
          <div>
            <p className="text-white text-sm font-medium">{testimonial.name}</p>
            <p className="text-slate-500 text-xs">{testimonial.title}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostcardsLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <div>
        <span className="text-white font-semibold text-base tracking-tight">postcards</span>
        <span className="text-indigo-400 font-semibold text-base">.studio</span>
      </div>
    </div>
  );
}
