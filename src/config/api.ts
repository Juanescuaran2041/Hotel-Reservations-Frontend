/** API root shared by local Vite proxy and the existing CloudFront deployment. */
export const API_BASE_URL: string = import.meta.env?.VITE_API_BASE_URL ?? '/api/v1';
