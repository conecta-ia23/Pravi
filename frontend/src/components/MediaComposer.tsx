import { Download, FileText, ImageIcon, Music4, Paperclip, Send, VideoIcon, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ChangeEvent } from "react";
import { useToast } from "../hooks/use-toast";
import { createLocalPreviewUrl, getMediaLabel, revokeLocalPreviewUrl, validateMediaFile } from "../lib/mediaUpload";

interface MediaComposerProps {
  darkMode?: boolean;
  pendingAttachment: File | null;
  onAttachmentSelected: (file: File | null) => void;
  onRemoveAttachment: () => void;
  onSend: () => void | Promise<void>;
  inputMessage: string;
  onInputChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
  isUploadingMedia: boolean;
  activationStatusLoading: boolean;
  isBotActive: boolean;
  testMode?: boolean;
}

export function MediaComposer({
  darkMode = false,
  pendingAttachment,
  onAttachmentSelected,
  onRemoveAttachment,
  onSend,
  inputMessage,
  onInputChange,
  onKeyDown,
  disabled,
  isUploadingMedia,
  activationStatusLoading,
  isBotActive,
  testMode = false,
}: MediaComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pickerAccept, setPickerAccept] = useState(
    "image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv"
  );

  const previewUrl = useMemo(() => {
    if (!pendingAttachment) return null;
    return createLocalPreviewUrl(pendingAttachment);
  }, [pendingAttachment]);

  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (previewUrl) revokeLocalPreviewUrl(previewUrl);
    };
  }, [previewUrl]);

  const openPicker = (accept: string) => {
    setPickerAccept(accept);
    setIsMenuOpen(false);
    requestAnimationFrame(() => fileInputRef.current?.click());
  };

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateMediaFile(file);
    if (!validation.valid) {
      toast({
        title: "Archivo no válido",
        description: validation.error || "No se pudo validar el archivo",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    onAttachmentSelected(file);
    event.target.value = "";
  };

  const handleSendClick = async () => {
    const hadAttachment = Boolean(pendingAttachment);

    await onSend();

    if (hadAttachment) {
      onRemoveAttachment();
    }
  };

  const isSendDisabled =
    disabled || (!inputMessage.trim() && !pendingAttachment) || isUploadingMedia;

  const fileSizeLabel = pendingAttachment
    ? `${(pendingAttachment.size / (1024 * 1024)).toFixed(2)} MB`
    : "";

  return (
    <div className="flex flex-col gap-2">
      {pendingAttachment ? (
        <div
          className={`flex flex-col gap-2 rounded-xl border p-3 text-sm ${
            darkMode
              ? "border-slate-700 bg-slate-800/80 text-slate-200"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{pendingAttachment.name}</p>
              <p className="text-[11px] opacity-70">
                {getMediaLabel(pendingAttachment)} • {fileSizeLabel}
              </p>
            </div>

            <button
              type="button"
              onClick={onRemoveAttachment}
              className="rounded-full p-1 hover:bg-white/10"
              aria-label="Quitar adjunto"
            >
              <X size={16} />
            </button>
          </div>

          {pendingAttachment.type?.startsWith("image/") ? (
            <div className="overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/50 p-2">
              <img
                src={previewUrl || undefined}
                alt="Preview del adjunto"
                className="max-h-48 w-full rounded-lg object-contain"
              />
            </div>
          ) : pendingAttachment.type?.startsWith("audio/") ? (
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
              <audio controls src={previewUrl || undefined} className="w-full" />
            </div>
          ) : pendingAttachment.type?.startsWith("video/") ? (
            <div className="overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/50 p-2">
              <video
                controls
                src={previewUrl || undefined}
                className="w-full max-h-48 rounded-lg"
              />
            </div>
          ) : (
            <div
              className={`rounded-xl border px-3 py-3 text-sm ${
                darkMode
                  ? "border-slate-700 bg-slate-900/70 text-slate-300"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className={`rounded-lg p-2 ${
                    darkMode ? "bg-slate-800" : "bg-slate-100"
                  }`}
                >
                  <FileText size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{pendingAttachment.name}</p>
                  <p className="text-[11px] opacity-70">{fileSizeLabel}</p>

                  {previewUrl ? (
                    <a
                      href={previewUrl}
                      download={pendingAttachment.name}
                      className={`mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${
                        darkMode
                          ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <Download size={12} />
                      Descargar
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {testMode ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              Modo prueba multimedia activo. El adjunto se visualizará localmente sin enviar al backend.
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="relative flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={pickerAccept}
          onChange={handleFileSelection}
        />

        <div className="relative self-end">
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            disabled={activationStatusLoading || isBotActive}
            className="flex h-12 min-w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:bg-slate-700 disabled:text-slate-400"
            title="Adjuntar archivo"
          >
            <Paperclip size={18} />
          </button>

          {isMenuOpen ? (
            <div className="absolute bottom-14 left-0 z-20 min-w-[170px] rounded-xl border border-slate-700 bg-slate-900/95 p-2 shadow-xl backdrop-blur">
              <button
                type="button"
                onClick={() => openPicker("image/*")}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
              >
                <ImageIcon size={15} />
                Imagen
              </button>

              <button
                type="button"
                onClick={() => openPicker("video/*")}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
              >
                <VideoIcon size={15} />
                Video
              </button>

              <button
                type="button"
                onClick={() => openPicker("audio/*")}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
              >
                <Music4 size={15} />
                Audio
              </button>

              <button
                type="button"
                onClick={() =>
                  openPicker(".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv")
                }
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
              >
                <FileText size={15} />
                Documento
              </button>
            </div>
          ) : null}
        </div>

        <textarea
          value={inputMessage}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            disabled
              ? "Selecciona una conversación para responder"
              : "Responder como asesor..."
          }
          disabled={disabled}
          rows={1}
          className="w-full max-h-28 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-[#dc0b2c] disabled:bg-slate-700 disabled:text-slate-400"
        />

        <button
          type="button"
          onClick={handleSendClick}
          disabled={isSendDisabled}
          className="flex h-12 min-w-12 items-center justify-center self-end rounded-xl bg-[#dc0b2c] text-white hover:bg-[#b91c1c] disabled:bg-gray-500 disabled:text-gray-300"
        >
          {isUploadingMedia ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
    </div>
  );
}