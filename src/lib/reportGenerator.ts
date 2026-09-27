import { jsPDF } from "jspdf";
import type { IntruderEvent } from "@/types";

export function generateIntruderReport(event: IntruderEvent) {
  const doc = new jsPDF();
  const margin = 20;
  let y = margin;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(239, 68, 68); // Red
  doc.text("SECURITY INCIDENT REPORT", margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Report ID: ${event.id || crypto.randomUUID()}`, margin, y);
  y += 5;
  doc.text(`Generated: ${new Date().toISOString()}`, margin, y);
  y += 15;

  // Incident Details
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Incident Details", margin, y);
  y += 10;

  doc.setFontSize(11);
  const details = [
    `Date & Time: ${new Date(event.created_at).toLocaleString()}`,
    `Location: ${event.location_label || "Unknown"}`,
    `Device: ${event.device_name || "Unknown"}`,
    `Threat Level: ${event.threat_level.toUpperCase()}`,
    `Risk Score: ${event.risk_score || "N/A"}/100`,
    `Match Confidence: ${event.match_confidence ? event.match_confidence + "%" : "N/A"}`,
    `Liveness Result: ${event.liveness_result || "N/A"}`,
    `Sync Status: ${event.sync_status || "synced"}`,
  ];

  details.forEach((line) => {
    doc.text(line, margin, y);
    y += 7;
  });

  y += 10;

  // AI Explanation
  doc.setFontSize(14);
  doc.text("AI Explanation", margin, y);
  y += 8;
  doc.setFontSize(11);
  
  const splitExplanation = doc.splitTextToSize(event.ai_explanation, 170);
  doc.text(splitExplanation, margin, y);
  y += splitExplanation.length * 6 + 10;

  // Recommendations
  if (event.ai_recommendations && event.ai_recommendations.length > 0) {
    doc.setFontSize(14);
    doc.text("Security Recommendations", margin, y);
    y += 8;
    doc.setFontSize(11);
    event.ai_recommendations.forEach((rec) => {
      const splitRec = doc.splitTextToSize(`• ${rec}`, 170);
      doc.text(splitRec, margin, y);
      y += splitRec.length * 6 + 2;
    });
    y += 8;
  }

  // Evidence
  if (event.photo_base64) {
    // Add page if image doesn't fit
    if (y > 200) {
      doc.addPage();
      y = margin;
    }
    
    doc.setFontSize(14);
    doc.text("Captured Evidence", margin, y);
    y += 10;

    try {
      // Depending on the format of photo_base64
      // We assume it is a data URL: data:image/jpeg;base64,...
      doc.addImage(event.photo_base64, "JPEG", margin, y, 100, 100);
    } catch (e) {
      doc.setFontSize(10);
      doc.setTextColor(255, 0, 0);
      doc.text("Failed to render image evidence.", margin, y);
    }
  }

  // Save the PDF
  doc.save(`Security_Report_${new Date().getTime()}.pdf`);
}
