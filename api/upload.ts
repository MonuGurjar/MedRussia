
import crypto from 'crypto';

export default async function handler(request, response) {
  // Helper to get credentials from either individual vars or CLOUDINARY_URL
  const getCreds = () => {
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
          return {
              cloudName: process.env.CLOUDINARY_CLOUD_NAME,
              apiKey: process.env.CLOUDINARY_API_KEY,
              apiSecret: process.env.CLOUDINARY_API_SECRET,
              uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET
          };
      }
      if (process.env.CLOUDINARY_URL) {
          // Format: cloudinary://api_key:api_secret@cloud_name
          try {
              const regex = /cloudinary:\/\/([^:]+):([^@]+)@(.+)/;
              const match = process.env.CLOUDINARY_URL.match(regex);
              if (match) {
                  return { 
                      apiKey: match[1], 
                      apiSecret: match[2], 
                      cloudName: match[3],
                      uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET 
                  };
              }
          } catch(e) { console.error("Failed to parse CLOUDINARY_URL"); }
      }
      // Fallback for just upload if only cloud name and preset exist (Unsigned only)
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_UPLOAD_PRESET) {
          return {
              cloudName: process.env.CLOUDINARY_CLOUD_NAME,
              uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
              apiKey: null,
              apiSecret: null
          };
      }
      return null;
  };

  const creds = getCreds();
  if (!creds) {
    return response.status(500).json({ error: 'Storage configuration missing on server' });
  }

  // --- DELETE FILE (Signed) ---
  if (request.method === 'DELETE') {
      if (!creds.apiKey || !creds.apiSecret) {
          return response.status(500).json({ error: 'API Key/Secret required for deletion' });
      }

      const { public_id, resource_type = 'image' } = request.body;
      
      if (!public_id) {
          return response.status(400).json({ error: 'public_id is required' });
      }

      const timestamp = Math.round(new Date().getTime() / 1000).toString();
      
      // Generate Signature: SHA1(params + secret)
      // Params must be sorted alphabetically
      const paramsToSign = `public_id=${public_id}&timestamp=${timestamp}`;
      const signature = crypto.createHash('sha1').update(paramsToSign + creds.apiSecret).digest('hex');

      const formData = new FormData();
      formData.append('public_id', public_id);
      formData.append('api_key', creds.apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);

      // Note: Cloudinary API endpoint for destroy
      const url = `https://api.cloudinary.com/v1_1/${creds.cloudName}/${resource_type}/destroy`;

      try {
          const res = await fetch(url, { method: 'POST', body: formData });
          const data = await res.json();
          if (data.result !== 'ok' && data.result !== 'not found') {
               // 'not found' is acceptable if we are cleaning up db
               throw new Error(data.error?.message || 'Cloudinary delete failed');
          }
          return response.status(200).json({ success: true, result: data });
      } catch (error) {
          console.error('Delete Proxy Error:', error);
          return response.status(500).json({ error: error.message });
      }
  }

  // --- UPLOAD FILE (Unsigned) ---
  if (request.method === 'POST') {
    try {
        const { fileData } = request.body; // Expecting Base64 string

        if (!fileData) {
            return response.status(400).json({ error: 'No file data provided' });
        }

        // Cloudinary Unsigned Upload API
        const url = `https://api.cloudinary.com/v1_1/${creds.cloudName}/auto/upload`;

        const formData = new FormData();
        formData.append('file', fileData);
        formData.append('upload_preset', creds.uploadPreset);

        const res = await fetch(url, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error?.message || 'Upload failed');
        }

        const data = await res.json();
        return response.status(200).json({ 
            secure_url: data.secure_url,
            public_id: data.public_id,
            format: data.format,
            resource_type: data.resource_type
        });

    } catch (error) {
        console.error('Upload Proxy Error:', error);
        return response.status(500).json({ error: error.message });
    }
  }

  return response.status(405).json({ error: 'Method Not Allowed' });
}
