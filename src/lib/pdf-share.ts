/**
 * src/lib/pdf-share.ts
 * Professional PDF Generation & WhatsApp Sharing Utility
 * for Dr. Ayus Homoeopathy Hospital.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import {
  validateAndNormalizePhone,
  buildWhatsAppDirectUrl,
  launchWhatsAppUrl,
} from "@/lib/whatsapp";

export { validateAndNormalizePhone };

/**
 * Sanitizes a string for use in dynamic PDF filenames.
 */
export function sanitizeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_\-\.]/g, "_").replace(/__+/g, "_");
}

/**
 * Builds the standard dynamic PDF filename for prescriptions.
 * Format: Dr_Ayus_Prescription_{registrationId}_{date}.pdf
 */
export function getPrescriptionPdfFilename(regNo: string, dateStr: string): string {
  const cleanReg = sanitizeFilename(regNo || "REG");
  const cleanDate = sanitizeFilename(dateStr || new Date().toISOString().slice(0, 10));
  return `Dr_Ayus_Prescription_${cleanReg}_${cleanDate}.pdf`;
}

/**
 * Builds the standard dynamic PDF filename for bills/invoices.
 * Format: Dr_Ayus_Bill_{billNumber}.pdf
 */
export function getBillPdfFilename(invoiceNo: string): string {
  const cleanInv = sanitizeFilename(invoiceNo || "INV");
  return `Dr_Ayus_Bill_${cleanInv}.pdf`;
}

/**
 * Triggers a direct browser file download for a File or Blob.
 */
export function downloadPdfFile(file: File | Blob, filename: string): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Converts a DOM element into a high-resolution A4 portrait PDF File.
 * Uses html-to-image to natively render modern CSS, oklch colors, and SVG vectors.
 */
export async function generatePdfFromElement(
  element: HTMLElement,
  filename: string
): Promise<File> {
  // Ensure custom fonts are loaded if available
  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font ready failures
    }
  }

  // Render DOM element to canvas using html-to-image (handles oklch, CSS vars, SVGs natively)
  const canvas = await toCanvas(element, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    skipFonts: true,
    cacheBust: true,
  });

  if (!canvas || canvas.width === 0 || canvas.height === 0) {
    throw new Error("Canvas rendering produced an empty image");
  }

  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  // A4 dimensions in mm (portrait): 210 x 297 mm
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pdfWidth = 210;
  const pdfHeight = 297;
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // First page
  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
  heightLeft -= pdfHeight;

  // Subsequent pages if content overflows single A4 page
  while (heightLeft > 5) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pdfHeight;
  }

  const blob = pdf.output("blob");
  return new File([blob], filename, { type: "application/pdf" });
}

/**
 * Mounts a React component into a hidden off-screen container with precise A4
 * dimensions (794px width = 210mm), renders it, and generates a PDF File.
 * This guarantees pristine layout regardless of current viewport size (mobile/desktop).
 */
export async function renderAndGeneratePdf(
  reactElement: React.ReactElement,
  filename: string
): Promise<File> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "0";
  container.style.top = "0";
  container.style.width = "794px";
  container.style.minWidth = "794px";
  container.style.maxWidth = "794px";
  container.style.boxSizing = "border-box";
  container.style.backgroundColor = "#ffffff";
  container.style.zIndex = "-9999";
  container.style.opacity = "0.01";
  container.style.pointerEvents = "none";
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(reactElement);

  // Allow React to commit to DOM & render SVG/images
  await new Promise((resolve) => setTimeout(resolve, 350));
  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font ready errors
    }
  }

  try {
    const targetElement = (container.firstElementChild as HTMLElement) || container;
    const file = await generatePdfFromElement(targetElement, filename);
    return file;
  } finally {
    try {
      root.unmount();
      document.body.removeChild(container);
    } catch {
      // Cleanup safety
    }
  }
}

export interface SharePdfOptions {
  file: File;
  phone?: string | null;
  patientName: string;
  docType: "prescription" | "bill";
  billNumber?: string;
}

/**
 * Builds the official WhatsApp accompanying message for prescriptions.
 */
export function buildPrescriptionShareMessage(patientName: string): string {
  const name = patientName?.trim() || "Patient";
  return `Dr. Ayus Homoeopathy Hospital\n\nDear ${name},\n\nPlease find your prescription attached.\n\nThank you.`;
}

/**
 * Builds the official WhatsApp accompanying message for bills.
 */
export function buildBillShareMessage(patientName: string, billNumber?: string): string {
  const name = patientName?.trim() || "Patient";
  const billNo = billNumber?.trim() || "—";
  return `Dr. Ayus Homoeopathy Hospital\n\nDear ${name},\n\nPlease find your bill attached.\n\nBill No: ${billNo}\n\nThank you.`;
}

/**
 * Shares a PDF file via direct WhatsApp click-to-chat:
 * 1. Validates the patient's phone number (rejects with explicit toast if missing/invalid).
 * 2. Downloads the generated PDF locally with standard hospital naming.
 * 3. Builds the direct WhatsApp conversation URL (web.whatsapp.com for Windows desktop).
 * 4. Opens the patient's chat directly with prefilled message (no generic share sheet).
 * 5. Informs the user to attach the downloaded PDF in the opened chat.
 */
export async function sharePdfViaWhatsApp(options: SharePdfOptions): Promise<boolean> {
  const { file, phone, docType } = options;

  // 1. Validate patient phone number (strict clinic rules)
  const phoneCheck = validateAndNormalizePhone(phone);
  if (!phoneCheck.valid || !phoneCheck.phone) {
    toast.error(
      phoneCheck.error || "Invalid patient phone number. Please check the patient's phone number."
    );
    return false;
  }

  // 2. Automatically save/download the generated PDF locally
  downloadPdfFile(file, file.name);

  // 3. For prescription & billing, open patient chat in WhatsApp Desktop app WITHOUT generating text in typing box
  const chatUrl = buildWhatsAppDirectUrl(phoneCheck.phone, "");

  // 4. Open patient's WhatsApp conversation in desktop application directly
  launchWhatsAppUrl(chatUrl);

  // 5. Display accurate instruction toast
  const readyToastMessage =
    docType === "prescription"
      ? "Prescription PDF downloaded. Attach it in the opened WhatsApp chat and send."
      : "Bill PDF downloaded. Attach it in the opened WhatsApp chat and send.";

  toast.info(readyToastMessage, {
    action: {
      label: "Open in WhatsApp",
      onClick: () => launchWhatsAppUrl(chatUrl),
    },
    duration: 8000,
  });

  return true;
}
