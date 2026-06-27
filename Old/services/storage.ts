
// Helper to convert file to Base64
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

export interface UploadResponse {
    secure_url: string;
    public_id: string;
    format: string;
    resource_type: string;
}

export const uploadFileToCloudinary = async (file: File): Promise<UploadResponse> => {
  try {
    // 1. Convert to Base64
    // Note: Vercel serverless functions have a body size limit (4.5MB).
    // Ensure the file isn't too large before sending.
    if (file.size > 3.5 * 1024 * 1024) { // Limit client-side to ~3.5MB to be safe with Base64 overhead
        throw new Error("File is too large for the current upload handler (Max 3.5MB).");
    }

    const base64Data = await toBase64(file);

    // 2. Send to Server Proxy
    const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileData: base64Data })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Server upload failed');
    }

    const data = await response.json();
    return data;

  } catch (error: any) {
    console.error("Cloudinary Upload Error:", error);
    throw new Error(error.message || "Failed to upload document");
  }
};

export const deleteFileFromCloudinary = async (publicId: string, resourceType: string = 'image'): Promise<void> => {
    try {
        const response = await fetch('/api/upload', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ public_id: publicId, resource_type: resourceType })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Delete failed');
        }
    } catch (error: any) {
        console.error("Cloudinary Delete Error:", error);
        throw new Error(error.message || "Failed to delete document");
    }
};
