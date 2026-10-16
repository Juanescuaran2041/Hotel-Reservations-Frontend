/**
 * Base URL of the backend API. In production it stays relative (`/api/v1`) because CloudFront
 * serves the site and forwards `/api/*` to the backend on the same domain.
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
