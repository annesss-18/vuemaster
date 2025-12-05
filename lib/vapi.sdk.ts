import Vapi from '@vapi-ai/web';

const vapiToken = process.env.NEXT_PUBLIC_VAPI_API_TOKEN;

if (!vapiToken) {
  throw new Error(
    "VAPI token is not provided. Please add NEXT_PUBLIC_VAPI_API_TOKEN to your .env.local file."
  );
}

export const vapi = new Vapi(vapiToken);