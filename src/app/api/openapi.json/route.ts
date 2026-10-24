import { openApiSpec } from '@/lib/openapi';
import { jsonResponse, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  return jsonResponse(openApiSpec);
}
