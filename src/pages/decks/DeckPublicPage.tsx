import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../lib/api";

export default function DeckPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.get(`/decks/public/${slug}/html`, { responseType: "text" })
      .then(r => setHtml(r.data))
      .catch(() => setError(true));
  }, [slug]);

  if (error) return (
    <div className="flex h-screen items-center justify-center text-slate-500 text-sm">
      Deck not found.
    </div>
  );

  if (!html) return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <iframe
      srcDoc={html}
      className="w-screen h-screen border-0"
      title="Deck"
      sandbox="allow-scripts allow-same-origin allow-popups"
    />
  );
}
