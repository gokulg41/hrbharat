
import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Keep your existing functions like formatINR here ---

// Append this standard B2B style-merging engine
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}/**
 * Formats numeric currency values into the standard clean Indian Rupee (INR) system
 */
export function formatINR(value: number | string): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numericValue)) return '₹0.00';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(numericValue);
}