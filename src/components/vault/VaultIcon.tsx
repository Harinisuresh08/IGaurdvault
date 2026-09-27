import {
  FileText,
  Image as ImageIcon,
  Video,
  File,
  CreditCard,
  StickyNote,
  Key,
  Award,
  Landmark,
  Car,
  Book,
  IdCard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { VaultCategory } from "@/types";

const ICON_MAP: Record<string, LucideIcon> = {
  "file-text": FileText,
  image: ImageIcon,
  video: Video,
  file: File,
  "credit-card": CreditCard,
  "sticky-note": StickyNote,
  key: Key,
  award: Award,
  landmark: Landmark,
  car: Car,
  book: Book,
  "id-card": IdCard,
};

export function VaultIcon({
  category,
  icon,
  size = 20,
  color,
}: {
  category?: VaultCategory;
  icon?: string;
  size?: number;
  color?: string;
}) {
  // icon string takes priority, otherwise derive from category
  const iconKey = icon ?? categoryToIcon(category);
  const Icon = ICON_MAP[iconKey] ?? File;
  return <Icon size={size} style={{ color }} />;
}

function categoryToIcon(cat?: VaultCategory | string): string {
  const map: Record<string, string> = {
    pdf: "file-text",
    image: "image",
    video: "video",
    document: "file",
    aadhaar: "id-card",
    pan_card: "id-card",
    passport: "book",
    driving_license: "car",
    certificate: "award",
    bank_document: "landmark",
    credit_card: "credit-card",
    debit_card: "credit-card",
    note: "sticky-note",
    recovery_code: "key",
    license_key: "key",
    personal_file: "file",
  };
  return cat ? map[cat] ?? "file" : "file";
}

export { categoryToIcon };
