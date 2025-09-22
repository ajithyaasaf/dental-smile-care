import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

export interface PhotoUploadOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
  folder?: string;
}

export interface PhotoUploadResult {
  url: string;
  path: string;
  size: number;
  type: string;
}

const DEFAULT_OPTIONS: PhotoUploadOptions = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  allowedTypes: ["image/jpeg", "image/jpg", "image/png"],
  folder: "patient-photos"
};

export class PhotoUploadError extends Error {
  constructor(
    message: string,
    public code: "INVALID_TYPE" | "FILE_TOO_LARGE" | "UPLOAD_FAILED" | "INVALID_FILE" | "ROLLBACK_FAILED" | "DUPLICATE_UPLOAD"
  ) {
    super(message);
    this.name = "PhotoUploadError";
  }
}

// Upload state management
interface UploadState {
  patientId: string;
  tempPath?: string;
  finalPath?: string;
  uploadId: string;
  retryCount: number;
  maxRetries: number;
}

const activeUploads = new Map<string, UploadState>();

export async function validatePhoto(file: File, options: PhotoUploadOptions = {}): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!file) {
    throw new PhotoUploadError("No file provided", "INVALID_FILE");
  }

  // Check file type
  if (!opts.allowedTypes?.includes(file.type)) {
    throw new PhotoUploadError(
      `Invalid file type. Allowed types: ${opts.allowedTypes?.join(", ")}`,
      "INVALID_TYPE"
    );
  }

  // Check file size
  if (opts.maxSizeBytes && file.size > opts.maxSizeBytes) {
    const maxMB = (opts.maxSizeBytes / (1024 * 1024)).toFixed(1);
    throw new PhotoUploadError(
      `File too large. Maximum size: ${maxMB}MB`,
      "FILE_TOO_LARGE"
    );
  }

  // Additional security checks
  const fileName = file.name.toLowerCase();
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif', '.vbs', '.js'];
  if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
    throw new PhotoUploadError(
      "File type not allowed for security reasons",
      "INVALID_TYPE"
    );
  }

  // Check for potential malicious content by examining file headers
  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer.slice(0, 12));
  
  // Check for valid image signatures
  const isJPEG = uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF;
  const isPNG = uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47;
  
  if (!isJPEG && !isPNG) {
    throw new PhotoUploadError(
      "File does not appear to be a valid image",
      "INVALID_FILE"
    );
  }
}

export async function uploadPatientPhoto(
  file: File, 
  patientId: string,
  options: PhotoUploadOptions = {}
): Promise<PhotoUploadResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const uploadId = `${patientId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Check for duplicate uploads
  if (activeUploads.has(patientId)) {
    throw new PhotoUploadError(
      "Upload already in progress for this patient",
      "DUPLICATE_UPLOAD"
    );
  }

  // Validate the file first
  await validatePhoto(file, opts);

  // Initialize upload state
  const uploadState: UploadState = {
    patientId,
    uploadId,
    retryCount: 0,
    maxRetries: 3
  };
  activeUploads.set(patientId, uploadState);

  try {
    // Create organized folder structure: patient-photos/YYYY/MM/patientId/
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${patientId}_${timestamp}.${fileExtension}`;
    const organizedPath = `${opts.folder}/${year}/${month}/${patientId}/${fileName}`;
    
    uploadState.tempPath = organizedPath;

    // Create storage reference
    const storageRef = ref(storage, organizedPath);

    // Upload file with metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        patientId: patientId,
        uploadId: uploadId,
        originalName: file.name,
        uploadTimestamp: now.toISOString()
      }
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    uploadState.finalPath = organizedPath;
    
    const result: PhotoUploadResult = {
      url: downloadURL,
      path: organizedPath,
      size: file.size,
      type: file.type
    };

    // Notify server about the upload for tracking
    try {
      const authToken = await getAuthToken(); // Assuming we have this function
      if (authToken) {
        await notifyServerOfUpload({
          patientId,
          tempPath: organizedPath,
          originalName: file.name,
          size: file.size,
          contentType: file.type,
          uploadId
        }, authToken);
      }
    } catch (serverNotifyError) {
      console.warn('Failed to notify server of upload (non-critical):', serverNotifyError);
      // Don't fail the upload if server notification fails
    }

    // Clean up upload state
    activeUploads.delete(patientId);
    
    return result;
  } catch (error) {
    console.error("Photo upload failed:", error);
    
    // Attempt to clean up partial upload
    if (uploadState.tempPath) {
      try {
        await deletePatientPhoto(uploadState.tempPath);
        console.log(`Cleaned up failed upload: ${uploadState.tempPath}`);
      } catch (cleanupError) {
        console.warn(`Failed to cleanup partial upload: ${uploadState.tempPath}`, cleanupError);
      }
    }
    
    // Retry logic
    if (uploadState.retryCount < uploadState.maxRetries) {
      uploadState.retryCount++;
      console.log(`Retrying upload (attempt ${uploadState.retryCount + 1}/${uploadState.maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * uploadState.retryCount)); // Exponential backoff
      return uploadPatientPhoto(file, patientId, options);
    }
    
    // Clean up upload state after max retries
    activeUploads.delete(patientId);
    
    throw new PhotoUploadError(
      `Failed to upload photo after ${uploadState.maxRetries + 1} attempts. Please try again.`,
      "UPLOAD_FAILED"
    );
  }
}

// Enhanced function to handle photo replacement with proper cleanup
export async function replacePatientPhoto(
  file: File,
  patientId: string,
  oldPhotoPath?: string,
  options: PhotoUploadOptions = {}
): Promise<PhotoUploadResult> {
  const result = await uploadPatientPhoto(file, patientId, options);
  
  // Clean up old photo after successful upload
  if (oldPhotoPath && oldPhotoPath !== result.path) {
    try {
      await deletePatientPhoto(oldPhotoPath);
      console.log(`Deleted old photo: ${oldPhotoPath}`);
    } catch (error) {
      console.warn(`Failed to delete old photo: ${oldPhotoPath}`, error);
      // Don't throw error for cleanup failures as the new upload succeeded
    }
  }
  
  return result;
}

export async function deletePatientPhoto(photoPath: string): Promise<void> {
  try {
    const storageRef = ref(storage, photoPath);
    await deleteObject(storageRef);
    console.log(`Successfully deleted photo: ${photoPath}`);
  } catch (error) {
    console.error("Photo deletion failed:", error);
    // Check if the error is because the file doesn't exist
    if ((error as any).code === 'storage/object-not-found') {
      console.log(`Photo already deleted or doesn't exist: ${photoPath}`);
      return; // Not an error condition
    }
    // For other errors, log but don't throw to avoid breaking the main flow
    console.warn(`Failed to delete photo ${photoPath}, this may require manual cleanup`);
  }
}

// Utility function to cancel ongoing uploads
export async function cancelPatientPhotoUpload(patientId: string): Promise<void> {
  const uploadState = activeUploads.get(patientId);
  if (!uploadState) {
    return; // No active upload
  }
  
  // Clean up any partial uploads
  if (uploadState.tempPath) {
    try {
      await deletePatientPhoto(uploadState.tempPath);
    } catch (error) {
      console.warn(`Failed to cleanup cancelled upload: ${uploadState.tempPath}`, error);
    }
  }
  
  activeUploads.delete(patientId);
  console.log(`Cancelled photo upload for patient: ${patientId}`);
}

// Get current local upload status
export function getLocalUploadStatus(patientId: string): UploadState | undefined {
  return activeUploads.get(patientId);
}

// Clean up stale uploads (call periodically)
export function cleanupStaleUploads(maxAgeMinutes: number = 30): void {
  const now = Date.now();
  const maxAge = maxAgeMinutes * 60 * 1000;
  
  Array.from(activeUploads.entries()).forEach(([patientId, uploadState]) => {
    const uploadAge = now - parseInt(uploadState.uploadId.split('_')[1]);
    if (uploadAge > maxAge) {
      console.log(`Cleaning up stale upload for patient: ${patientId}`);
      cancelPatientPhotoUpload(patientId).catch(console.warn);
    }
  });
}

export function createPhotoPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function revokePhotoPreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Server-side upload tracking integration
interface UploadTrackingData {
  patientId: string;
  tempPath: string;
  originalName: string;
  size: number;
  contentType: string;
  uploadId: string;
}

// Get Firebase auth token for server communication
export async function getAuthToken(): Promise<string | null> {
  try {
    // Import auth from firebase config
    const { auth } = await import('./firebase');
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

// Notify server of photo upload for tracking
async function notifyServerOfUpload(uploadData: UploadTrackingData, authToken: string): Promise<void> {
  const response = await fetch('/api/uploads/photos/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(uploadData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Server tracking failed: ${errorData.error || response.statusText}`);
  }

  console.log('Photo upload tracked on server:', uploadData.uploadId);
}

// Notify server of photo re-pathing
export async function notifyServerOfRepath(tempPath: string, finalPath: string, patientId: string): Promise<void> {
  try {
    const authToken = await getAuthToken();
    if (!authToken) {
      throw new Error('No authentication token available');
    }

    const response = await fetch('/api/uploads/photos/repath', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        tempPath,
        finalPath,
        patientId
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Photo re-pathing failed: ${errorData.error || response.statusText}`);
    }

    console.log('Photo re-pathing completed on server');
  } catch (error) {
    console.error('Failed to notify server of photo re-pathing:', error);
    throw error;
  }
}

// Get upload status for a patient
export async function getUploadStatus(patientId: string): Promise<any[]> {
  try {
    const authToken = await getAuthToken();
    if (!authToken) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(`/api/uploads/photos/status/${patientId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to get upload status: ${errorData.error || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get upload status:', error);
    return [];
  }
}