const DATE_DIGITS = /^(\d{2})(\d{2})(\d{4})$/
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function sanitizeDateInput(value: string): string { return value.replace(/\D/g, "").slice(0, 8) }
export function formatCompactDateInput(value: string): string { const digits=sanitizeDateInput(value);return digits.length<=2?digits:digits.length<=4?`${digits.slice(0,2)}/${digits.slice(2)}`:`${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}` }
function valid(day:number,month:number,year:number){if(year<1900||year>2100||month<1||month>12||day<1)return false;const date=new Date(year,month-1,day);return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day}
export function parseCompactDate(value:string){const match=sanitizeDateInput(value).match(DATE_DIGITS);if(!match)return null;const day=Number(match[1]),month=Number(match[2]),year=Number(match[3]);return valid(day,month,year)?{day,month,year}:null}
export function formatDateForSheet(value:string){if(!value.trim())return "";const iso=value.trim().match(ISO_DATE);if(iso&&valid(Number(iso[3]),Number(iso[2]),Number(iso[1])))return value.trim();const parts=parseCompactDate(value);if(!parts)throw new Error("Date invalide.");return `${parts.year}-${String(parts.month).padStart(2,"0")}-${String(parts.day).padStart(2,"0")}`}
export function formatDateForDisplay(value:string){if(!value.trim())return "";const iso=value.trim().match(ISO_DATE);if(iso)return `${iso[3]}/${iso[2]}/${iso[1]}`;const parts=parseCompactDate(value);return parts?`${String(parts.day).padStart(2,"0")}/${String(parts.month).padStart(2,"0")}/${parts.year}`:value.trim()}
