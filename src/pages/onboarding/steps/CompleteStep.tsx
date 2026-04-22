import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/Button";

interface CompleteStepProps {
  name: string;
}

export function CompleteStep({ name }: CompleteStepProps) {
  const navigate = useNavigate();
  const firstName = name.split(" ")[0];

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-4">
      {/* Animated checkmark */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 animate-bounce-once">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        {/* Sparkles */}
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full opacity-80" />
        <div className="absolute -bottom-1 -left-2 w-3 h-3 bg-indigo-400 rounded-full opacity-60" />
        <div className="absolute top-2 -left-3 w-2 h-2 bg-pink-400 rounded-full opacity-70" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">
          You're all set, {firstName}!
        </h2>
        <p className="text-slate-500 text-sm max-w-xs mx-auto">
          Your workspace and voice profile are ready. Time to create your first post.
        </p>
      </div>

      {/* What's next */}
      <div className="w-full bg-slate-50 rounded-2xl p-5 text-left space-y-3 border border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          What happens next
        </p>
        {[
          {
            icon: "✦",
            title: "Write your first post",
            desc: "Pick a topic and let AI draft it in your voice.",
          },
          {
            icon: "✦",
            title: "Invite your team",
            desc: "Add your EA or comms team to help manage content.",
          },
          {
            icon: "✦",
            title: "Connect LinkedIn",
            desc: "Publish directly without copy-pasting.",
          },
        ].map((item) => (
          <div key={item.title} className="flex gap-3 items-start">
            <span className="text-indigo-500 text-sm mt-0.5 font-bold">{item.icon}</span>
            <div>
              <p className="text-sm font-medium text-slate-800">{item.title}</p>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Button
        size="lg"
        fullWidth
        onClick={() => navigate("/composer")}
      >
        Write my first post →
      </Button>

      <button
        onClick={() => navigate("/dashboard")}
        className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
      >
        Go to dashboard instead
      </button>
    </div>
  );
}
