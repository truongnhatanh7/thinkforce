import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function refineMarkdownTitleToFlatString(title: string) {
  return title.replaceAll("#", "").replaceAll("\n", "").trim();
}
