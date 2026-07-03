import { useState } from "react";
import {
  Download,
  FileText,
  ImageIcon,
  Video,
  Volume2,
  Eye,
  ExternalLink,
  X,
} from "lucide-react";

type MediaData = {
  url: string;
  downloadUrl?: string;
  kind?: "image" | "audio" | "video" | "document" | string;
  mime?: string;
  name?: string;
  filename?: string;
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
  const [imageOpen, setImageOpen] = useState(false);

  const kind = media.kind || "document";
  const fileName = media.name || media.filename || "Archivo recibido";
  const fileSize = formatSize(media.size);
  const viewUrl = media.url;
  const downloadUrl = media.downloadUrl || media.url;

  const openInNewTab = () => {
    window.open(viewUrl, "_blank", "noopener,noreferrer");
  };

  const downloadFile = async () => {
    try {
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        throw new Error("No se pudo descargar el archivo");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const ActionButton = ({
    onClick,
    title,
    children,
  }: {
    onClick: () => void;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="h-9 w-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
    >
      {children}
    </button>
  );

  if (kind === "audio") {
    return (
      <div className="w-[300px] rounded-2xl bg-slate-800/90 border border-white/10 p-3 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Volume2 size={20} className="text-emerald-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              Audio recibido
            </p>
            <p className="text-slate-400 text-xs truncate">
              {fileSize || "WhatsApp audio"}
            </p>
          </div>

          <div className="flex gap-2">
            <ActionButton onClick={openInNewTab} title="Abrir audio">
              <ExternalLink size={17} className="text-white" />
            </ActionButton>

            <ActionButton onClick={downloadFile} title="Descargar audio">
              <Download size={17} className="text-white" />
            </ActionButton>
          </div>
        </div>

        <audio controls preload="metadata" className="w-full">
          <source src={viewUrl} type={media.mime || "audio/ogg"} />
          Tu navegador no soporta audio.
        </audio>

        {caption && <p className="mt-2 text-sm text-slate-200">{caption}</p>}
      </div>
    );
  }

  if (kind === "image") {
    return (
      <>
        <div className="max-w-[320px] rounded-2xl overflow-hidden bg-slate-800 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-slate-300 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <ImageIcon size={14} />
              <span className="truncate">Imagen recibida</span>
            </div>

            <div className="flex gap-2">
              <ActionButton onClick={() => setImageOpen(true)} title="Ver imagen">
                <Eye size={17} className="text-white" />
              </ActionButton>

              <ActionButton onClick={downloadFile} title="Descargar imagen">
                <Download size={17} className="text-white" />
              </ActionButton>
            </div>
          </div>

          <img
            src={viewUrl}
            alt={fileName}
            onClick={() => setImageOpen(true)}
            className="w-full max-h-[360px] object-cover cursor-pointer"
          />

          {caption && <p className="p-3 text-sm text-white">{caption}</p>}
        </div>

        {imageOpen && (
          <div
            className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setImageOpen(false)}
          >
            <div
              className="relative max-w-[94vw] max-h-[94vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setImageOpen(false)}
                className="absolute -top-11 right-0 h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition"
                title="Cerrar"
              >
                <X size={22} className="text-white" />
              </button>

              <img
                src={viewUrl}
                alt={fileName}
                className="max-w-[94vw] max-h-[82vh] object-contain rounded-2xl shadow-2xl"
              />

              <div className="flex justify-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={openInNewTab}
                  className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm flex items-center gap-2 transition"
                >
                  <ExternalLink size={17} />
                  Abrir
                </button>

                <button
                  type="button"
                  onClick={downloadFile}
                  className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm flex items-center gap-2 transition"
                >
                  <Download size={17} />
                  Descargar
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (kind === "video") {
    return (
      <div className="w-[320px] rounded-2xl overflow-hidden bg-slate-800 border border-white/10 shadow-lg">
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-slate-300 text-xs">
          <div className="flex items-center gap-2">
            <Video size={14} />
            <span>Video recibido</span>
          </div>

          <div className="flex gap-2">
            <ActionButton onClick={openInNewTab} title="Abrir video">
              <ExternalLink size={17} className="text-white" />
            </ActionButton>

            <ActionButton onClick={downloadFile} title="Descargar video">
              <Download size={17} className="text-white" />
            </ActionButton>
          </div>
        </div>

        <video controls preload="metadata" className="w-full rounded-b-2xl">
          <source src={viewUrl} type={media.mime || "video/mp4"} />
          Tu navegador no soporta video.
        </video>

        {caption && <p className="p-3 text-sm text-white">{caption}</p>}
      </div>
    );
  }

  return (
    <div className="w-[320px] rounded-2xl bg-slate-800/90 border border-white/10 p-3 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <FileText size={22} className="text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{fileName}</p>
          <p className="text-slate-400 text-xs">
            {fileSize || media.mime || "Documento recibido"}
          </p>
        </div>

        <div className="flex gap-2">
          <ActionButton onClick={openInNewTab} title="Abrir documento">
            <ExternalLink size={17} className="text-white" />
          </ActionButton>

          <ActionButton onClick={downloadFile} title="Descargar documento">
            <Download size={17} className="text-white" />
          </ActionButton>
        </div>
      </div>

      {caption && <p className="mt-3 text-sm text-slate-200">{caption}</p>}
    </div>
  );
}