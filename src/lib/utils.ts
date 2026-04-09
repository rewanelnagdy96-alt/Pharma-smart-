import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const convertArabicToEnglishNumbers = (str: string | number): string => {
  if (str === null || str === undefined) return '';
  const stringValue = String(str);
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return stringValue.replace(/[٠-٩]/g, (d) => arabicNumbers.indexOf(d).toString());
};
