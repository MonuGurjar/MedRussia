
export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // Only return truly public configuration here if needed in the future.
  // Sensitive keys (EmailJS, Cloudinary) are now used exclusively on the server side
  // in api/email.ts and api/upload.ts.
  
  const config = {
    // Example: Feature flags that are safe to expose could go here
    serverStatus: 'online'
  };

  return response.status(200).json(config);
}
