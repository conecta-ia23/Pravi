export type MediaCategory = "image" | "audio" | "video" | "document";

export interface MediaValidationResult {
  valid: boolean;
  category: MediaCategory;
  mimeType: string;
  error?: string;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/csv",
];

const ACCEPTED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".mp3",
  ".wav",
  ".mp4",
  ".mov",
  ".webm",
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".xls",
  ".xlsx",
  ".csv",
];

export function validateMediaFile(file: File): MediaValidationResult {
  const mimeType = file.type || inferMimeTypeFromName(file.name);
  const category = getMediaCategoryFromType(mimeType);

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      category,
      mimeType,
      error: "El archivo supera el límite de 10 MB.",
    };
  }

  const isAcceptedMime = ACCEPTED_MIME_TYPES.includes(mimeType);
  const hasAcceptedExtension = ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

  if (!isAcceptedMime && !hasAcceptedExtension) {
    return {
      valid: false,
      category,
      mimeType,
      error: "Tipo de archivo no soportado.",
    };
  }

  return {
    valid: true,
    category,
    mimeType,
  };
}

export function getMediaCategoryFromType(type?: string): MediaCategory {
  if (!type) return "document";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("video/")) return "video";
  return "document";
}

export function getMediaTypeForFile(file: File): string {
  if (file.type) return file.type;
  return inferMimeTypeFromName(file.name);
}

export function createLocalPreviewUrl(file: File): string | null {
  if (typeof window === "undefined") return null;
  return URL.createObjectURL(file);
}

export function revokeLocalPreviewUrl(url?: string | null): void {
  if (url) URL.revokeObjectURL(url);
}

export function getMediaLabel(file: File): string {
  const category = getMediaCategoryFromType(file.type || inferMimeTypeFromName(file.name));
  if (category === "image") return "Imagen";
  if (category === "audio") return "Audio";
  if (category === "video") return "Video";
  return "Documento";
}

function inferMimeTypeFromName(fileName: string): string {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".doc")) return "application/msword";
  if (lowerName.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.endsWith(".webp")) return "image/webp";
  if (lowerName.endsWith(".gif")) return "image/gif";
  if (lowerName.endsWith(".mp3")) return "audio/mpeg";
  if (lowerName.endsWith(".wav")) return "audio/wav";
  if (lowerName.endsWith(".mp4")) return "video/mp4";
  if (lowerName.endsWith(".mov")) return "video/quicktime";
  if (lowerName.endsWith(".webm")) return "video/webm";
  if (lowerName.endsWith(".txt")) return "text/plain";
  if (lowerName.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lowerName.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lowerName.endsWith(".csv")) return "application/csv";
  return "application/octet-stream";
}
