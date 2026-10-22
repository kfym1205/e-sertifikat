import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Activity, CertificateIssuance, CertificateTemplate, LayoutElement } from '../types';

export interface GeneratePdfOptions {
  template: CertificateTemplate;
  layoutElements: LayoutElement[];
  issuance: {
    participantName: string;
    registrationNumber: string;
    issueDate: string;
    verificationId: string;
    extraText?: string;
  };
  baseUrl?: string;
}

/**
 * Generate QR Code data URL for certificate verification
 */
export async function generateQrCodeDataUrl(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      margin: 1,
      width: 240,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}

/**
 * Apply text transform rules (none, uppercase, capitalize, lowercase)
 */
export function applyTextTransform(text: string, transform?: string): string {
  if (!text) return '';
  switch (transform) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'capitalize':
      return text
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    default:
      return text;
  }
}

/**
 * Maps common web font families to standard PDF-supported font equivalents
 */
function getPdfStandardFont(fontFamily: string): { font: string; style: string } {
  const family = fontFamily.toLowerCase();
  if (family.includes('playfair') || family.includes('cinzel') || family.includes('merriweather') || family.includes('serif')) {
    return { font: 'times', style: 'normal' };
  }
  if (family.includes('great vibes') || family.includes('alex brush') || family.includes('cursive')) {
    return { font: 'times', style: 'italic' };
  }
  return { font: 'helvetica', style: 'normal' };
}

/**
 * Generates an A4 PDF from a template and layout elements with exact mm positioning
 */
export async function generateCertificatePdf(options: GeneratePdfOptions): Promise<jsPDF> {
  const { template, layoutElements, issuance, baseUrl = window.location.origin } = options;
  const isLandscape = template.orientation === 'landscape';

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const widthMm = isLandscape ? 297 : 210;
  const heightMm = isLandscape ? 210 : 297;

  // 1. Gambar latar belakang (Template Background)
  if (template.bgImageUrl) {
    try {
      const imgFormat = template.bgImageUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(template.bgImageUrl, imgFormat, 0, 0, widthMm, heightMm, undefined, 'FAST');
    } catch (e) {
      console.warn('Gagal memuat latar belakang langsung, melanjutkan dengan elemen:', e);
    }
  }

  // 2. Siapkan QR Code jika elemen QR diaktifkan
  const qrElement = layoutElements.find(el => el.id === 'qr_code' && el.enabled);
  let qrDataUrl = '';
  if (qrElement) {
    const verifyUrl = `${baseUrl}/verifikasi/${issuance.verificationId}`;
    qrDataUrl = await generateQrCodeDataUrl(verifyUrl);
  }

  // 3. Render setiap elemen sesuai koordinat mm
  for (const element of layoutElements) {
    if (!element.enabled) continue;

    if (element.id === 'qr_code') {
      if (qrDataUrl) {
        const qrSizeMm = element.fontSizePt ? Math.max(16, element.fontSizePt * 0.7) : 22;
        doc.addImage(qrDataUrl, 'PNG', element.xMm, element.yMm, qrSizeMm, qrSizeMm);
      }
      continue;
    }

    let textValue = '';
    switch (element.id) {
      case 'participant_name':
        textValue = applyTextTransform(issuance.participantName, element.textTransform);
        break;
      case 'reg_number':
        textValue = issuance.registrationNumber;
        break;
      case 'cert_date':
        textValue = issuance.issueDate;
        break;
      case 'extra_text':
        textValue = issuance.extraText || element.sampleValue || '';
        break;
    }

    if (!textValue) continue;

    // Set font
    const { font } = getPdfStandardFont(element.fontFamily);
    const isBold = element.fontWeight === 'bold' || element.fontWeight === '700' || element.fontWeight === '600';
    const isItalic = element.fontStyle === 'italic';
    const fontStyle = isBold && isItalic ? 'bolditalic' : isBold ? 'bold' : isItalic ? 'italic' : 'normal';

    doc.setFont(font, fontStyle);
    doc.setFontSize(element.fontSizePt || 14);

    // Set Color
    if (element.color) {
      doc.setTextColor(element.color);
    } else {
      doc.setTextColor('#0f172a');
    }

    const textOptions: { align: 'left' | 'center' | 'right'; maxWidth?: number } = {
      align: element.textAlign || 'center'
    };

    if (element.maxWidthMm && element.maxWidthMm > 0) {
      textOptions.maxWidth = element.maxWidthMm;
    }

    doc.text(textValue, element.xMm, element.yMm, textOptions);
  }

  return doc;
}

/**
 * Helper to download PDF directly in browser
 */
export async function downloadCertificatePdf(
  template: CertificateTemplate,
  layoutElements: LayoutElement[],
  issuance: {
    participantName: string;
    registrationNumber: string;
    issueDate: string;
    verificationId: string;
    extraText?: string;
  },
  filename?: string
): Promise<void> {
  const doc = await generateCertificatePdf({
    template,
    layoutElements,
    issuance
  });

  const safeName = (issuance.participantName || 'peserta').replace(/[^a-zA-Z0-9]/g, '_');
  const safeNumber = (issuance.registrationNumber || 'sertifikat').replace(/[^a-zA-Z0-9]/g, '_');
  const finalFilename = filename || `Sertifikat_${safeNumber}_${safeName}.pdf`;

  doc.save(finalFilename);
}

/**
 * Helper to get PDF as Data URL string
 */
export async function getCertificatePdfDataUrl(
  template: CertificateTemplate,
  layoutElements: LayoutElement[],
  issuance: {
    participantName: string;
    registrationNumber: string;
    issueDate: string;
    verificationId: string;
    extraText?: string;
  }
): Promise<string> {
  const doc = await generateCertificatePdf({
    template,
    layoutElements,
    issuance
  });
  return doc.output('datauristring');
}
