import { Download, FileText, ImageIcon, Video, Volume2 } from "lucide-react";

type MediaData = {
  url: string;
  kind?: "image" | "audio" | "video" | "document" | string;
  mime?: string;
  name?: string;
  size?: number;
};

type MediaBubbleProps = {
  media: MediaData;
  caption?: string;
  isAi?: boolean;
  darkMode?: boolean;
};

const formatSize = (size?: number) => {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export function MediaBubble({ media, caption }: MediaBubbleProps) {
  const kind = media.kind || "document";
  const fileName = media.name || "Archivo recibido";
  const fileSize = formatSize(media.size);

  if (kind === "audio") {
    return (
      <div className="w-[280px] rounded-2xl bg-slate-800/90 border border-white/10 p-3 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Volume2 size={20} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">Audio recibido</p>
            <p className="text-slate-400 text-xs truncate">{fileSize || "WhatsApp audio"}</p>
          </div>
        </div>

        <audio controls preload="metadata" className="w-full">
          <source src={media.url} type={media.mime || "audio/ogg"} />
          Tu navegador no soporta audio.
        </audio>

        {caption && <p className="mt-2 text-sm text-slate-200">{caption}</p>}
      </div>
    );
  }

  if (kind === "image") {
    return (
      <div className="max-w-[320px] rounded-2xl overflow-hidden bg-slate-800 border border-white/10 shadow-lg">
        <div className="flex items-center gap-2 px-3 py-2 text-slate-300 text-xs">
          <ImageIcon size={14} />
          Imagen recibida
        </div>
        <img
          src={media.url}
          alt={fileName}
          className="w-full max-h-[360px] object-cover"
        />
        {caption && <p className="p-3 text-sm text-white">{caption}</p>}
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className="w-[320px] rounded-2xl overflow-hidden bg-slate-800 border border-white/10 shadow-lg">
        <div className="flex items-center gap-2 px-3 py-2 text-slate-300 text-xs">
          <Video size={14} />
          Video recibido
        </div>
        <video controls preload="metadata" className="w-full rounded-b-2xl">
          <source src={media.url} type={media.mime || "video/mp4"} />
          Tu navegador no soporta video.
        </video>
        {caption && <p className="p-3 text-sm text-white">{caption}</p>}
      </div>
    );
  }

  return (
    <div className="w-[300px] rounded-2xl bg-slate-800/90 border border-white/10 p-3 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <FileText size={22} className="text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{fileName}</p>
          <p className="text-slate-400 text-xs">
            {fileSize || "Documento recibido"}
          </p>
        </div>

        <a
          href={media.url}
          target="_blank"
          rel="noreferrer"
          download={fileName}
          className="h-9 w-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
          title="Descargar"
        >
          <Download size={18} className="text-white" />
        </a>
      </div>

      {caption && <p className="mt-3 text-sm text-slate-200">{caption}</p>}
    </div>
  );
}