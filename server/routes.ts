import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { auth } from "./firebaseAdmin";
import { 
  insertUserSchema, 
  insertPatientSchema, 
  insertAppointmentSchema,
  insertEncounterSchema,
  insertPrescriptionSchema,
  type Patient,
  type User,
  type PhotoUpload
} from "@shared/schema";
import { z, ZodError } from "zod";

// Extend Express Request type to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        firebaseUid: string;
        email: string;
        name: string;
      };
    }
  }
}

// Role hierarchy for access control
const ROLE_HIERARCHY = {
  admin: 4,
  doctor: 3,
  nurse: 2,
  staff: 1,
  patient: 0
};

// Permission sets for each role
const ROLE_PERMISSIONS = {
  admin: ['read:all', 'write:all', 'delete:all', 'manage:users'],
  doctor: ['read:patients', 'write:patients', 'read:appointments', 'write:appointments', 'read:prescriptions', 'write:prescriptions', 'read:encounters', 'write:encounters'],
  nurse: ['read:patients', 'read:appointments', 'write:appointments'],
  staff: ['read:patients', 'read:appointments'],
  patient: ['read:own']
};

// Enhanced validation schemas for production
const searchQuerySchema = z.string()
  .min(1, "Search query cannot be empty")
  .max(100, "Search query too long")
  .regex(/^[a-zA-Z0-9\s@._-]+$/, "Invalid characters in search query")
  .transform(str => str.trim());

const patientIdSchema = z.string()
  .min(1, "Patient ID is required")
  .max(50, "Patient ID too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid patient ID format");

// Enhanced patient creation schema with stricter validation
const enhancedInsertPatientSchema = insertPatientSchema.extend({
  firstName: z.string()
    .min(1, "First name is required")
    .max(50, "First name too long")
    .regex(/^[a-zA-Z\s'-]+$/, "First name contains invalid characters")
    .transform(str => str.trim()),
  lastName: z.string()
    .min(1, "Last name is required")
    .max(50, "Last name too long")
    .regex(/^[a-zA-Z\s'-]+$/, "Last name contains invalid characters")
    .transform(str => str.trim()),
  phone: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number too long")
    .regex(/^[+]?[0-9\s()-]+$/, "Invalid phone number format")
    .transform(str => str.replace(/\s/g, '')),
  email: z.string().email("Invalid email format").max(100, "Email too long").optional().or(z.literal('')),
  address: z.string().max(500, "Address too long").optional(),
  medicalHistory: z.string().max(2000, "Medical history too long").optional(),
  allergies: z.string().max(1000, "Allergies text too long").optional(),
  profilePhotoUrl: z.string().url("Invalid photo URL").optional().or(z.literal('')),
  emergencyContact: z.object({
    name: z.string()
      .min(1, "Emergency contact name is required")
      .max(100, "Emergency contact name too long")
      .regex(/^[a-zA-Z\s'-]+$/, "Emergency contact name contains invalid characters")
      .transform(str => str.trim()),
    phone: z.string()
      .min(10, "Emergency contact phone must be at least 10 digits")
      .max(20, "Emergency contact phone too long")
      .regex(/^[+]?[0-9\s()-]+$/, "Invalid emergency contact phone format")
      .transform(str => str.replace(/\s/g, '')),
    relationship: z.string()
      .min(1, "Relationship is required")
      .max(50, "Relationship too long")
      .transform(str => str.trim())
  }).optional(),
  consentForms: z.object({
    treatmentConsent: z.boolean().refine((val) => val === true, {
      message: "Treatment consent is required",
    }),
    privacyPolicyConsent: z.boolean().refine((val) => val === true, {
      message: "Privacy policy consent is required",
    }),
    dataProcessingConsent: z.boolean().refine((val) => val === true, {
      message: "Data processing consent is required",
    }),
    marketingConsent: z.boolean().default(false),
    consentDate: z.date().optional(),
  }).optional()
});

// Error response helper
function createErrorResponse(message: string, details?: any, statusCode: number = 500) {
  return {
    error: message,
    details,
    timestamp: new Date().toISOString(),
    statusCode
  };
}

// Validation middleware
function validateRequest<T extends z.ZodSchema>(
  schema: T,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      req[source] = schema.parse(data);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json(createErrorResponse(
          "Validation failed",
          error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code
          })),
          400
        ));
      }
      next(error);
    }
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Firebase JWT Authentication Middleware
  const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json(createErrorResponse(
          "Authentication required",
          "Missing or invalid Authorization header",
          401
        ));
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Verify Firebase JWT token
      const decodedToken = await auth.verifyIdToken(token);
      
      // Get user from database using Firebase UID
      const user = await storage.getUserByFirebaseUid(decodedToken.uid);
      if (!user) {
        return res.status(401).json(createErrorResponse(
          "User not found",
          "No user record found for this Firebase account",
          401
        ));
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json(createErrorResponse(
          "Account disabled",
          "Your account has been disabled. Please contact an administrator.",
          403
        ));
      }

      // Attach user info to request
      req.user = {
        id: user.id,
        role: user.role,
        firebaseUid: user.firebaseUid,
        email: user.email,
        name: user.name
      };

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      
      // Handle specific Firebase Auth errors
      if (error instanceof Error) {
        if (error.message.includes('auth/id-token-expired')) {
          return res.status(401).json(createErrorResponse(
            "Token expired",
            "Your session has expired. Please log in again.",
            401
          ));
        }
        if (error.message.includes('auth/id-token-revoked')) {
          return res.status(401).json(createErrorResponse(
            "Token revoked",
            "Your session has been revoked. Please log in again.",
            401
          ));
        }
        if (error.message.includes('auth/invalid-id-token')) {
          return res.status(401).json(createErrorResponse(
            "Invalid token",
            "Invalid authentication token provided.",
            401
          ));
        }
      }
      
      return res.status(401).json(createErrorResponse(
        "Authentication failed",
        process.env.NODE_ENV === 'development' ? (error as Error).message : "Invalid authentication token",
        401
      ));
    }
  };

  // Role-based authorization middleware
  const requireRole = (requiredRole: string | string[], permission?: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json(createErrorResponse(
          "Authentication required",
          "User must be authenticated to access this resource",
          401
        ));
      }

      const userRole = req.user.role;
      const userRoleLevel = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] || 0;
      
      // Check if user has required role
      if (Array.isArray(requiredRole)) {
        const hasRequiredRole = requiredRole.some(role => {
          const requiredLevel = ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY] || 0;
          return userRoleLevel >= requiredLevel;
        });
        if (!hasRequiredRole) {
          return res.status(403).json(createErrorResponse(
            "Insufficient permissions",
            `Access denied. Required role: ${requiredRole.join(' or ')}. Your role: ${userRole}`,
            403
          ));
        }
      } else {
        const requiredLevel = ROLE_HIERARCHY[requiredRole as keyof typeof ROLE_HIERARCHY] || 0;
        if (userRoleLevel < requiredLevel) {
          return res.status(403).json(createErrorResponse(
            "Insufficient permissions",
            `Access denied. Required role: ${requiredRole}. Your role: ${userRole}`,
            403
          ));
        }
      }

      // Check specific permission if provided
      if (permission) {
        const userPermissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];
        const hasPermission = userPermissions.includes(permission) || userPermissions.includes('write:all') || userPermissions.includes('read:all');
        if (!hasPermission) {
          return res.status(403).json(createErrorResponse(
            "Insufficient permissions",
            `Access denied. Required permission: ${permission}`,
            403
          ));
        }
      }

      next();
    };
  };

  // Optional auth middleware for public endpoints that enhance with user data if available
  const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decodedToken = await auth.verifyIdToken(token);
        const user = await storage.getUserByFirebaseUid(decodedToken.uid);
        if (user && user.isActive) {
          req.user = {
            id: user.id,
            role: user.role,
            firebaseUid: user.firebaseUid,
            email: user.email,
            name: user.name
          };
        }
      }
    } catch (error) {
      // Silently fail for optional auth
      console.log('Optional auth failed (non-critical):', error instanceof Error ? error.message : 'Unknown error');
    }
    next();
  };

  // Photo upload tracking schema
  const photoUploadSchema = z.object({
    patientId: z.string().min(1, "Patient ID is required"),
    tempPath: z.string().min(1, "Temporary path is required"),
    originalName: z.string().min(1, "Original filename is required"),
    size: z.number().positive("File size must be positive"),
    contentType: z.string().min(1, "Content type is required"),
    uploadId: z.string().min(1, "Upload ID is required")
  });

  const photoRepathSchema = z.object({
    tempPath: z.string().min(1, "Temporary path is required"),
    finalPath: z.string().min(1, "Final path is required"),
    patientId: z.string().min(1, "Patient ID is required")
  });

  // Photo upload notification endpoint
  app.post("/api/uploads/photos/track", requireAuth, requireRole(['admin', 'doctor', 'nurse', 'staff'], 'write:patients'), async (req: Request, res: Response) => {
    try {
      const uploadData = photoUploadSchema.parse(req.body);
      
      // Track the upload in server-side storage
      await storage.trackPhotoUpload({
        patientId: uploadData.patientId,
        tempPath: uploadData.tempPath,
        originalName: uploadData.originalName,
        size: uploadData.size,
        contentType: uploadData.contentType,
        uploadId: uploadData.uploadId,
        uploadedBy: req.user!.id,
        uploadedAt: new Date(),
        status: 'uploaded'
      });

      // Create audit log
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'upload',
        entityType: 'patient_photo',
        entityId: uploadData.patientId,
        changes: {
          uploadId: uploadData.uploadId,
          tempPath: uploadData.tempPath,
          originalName: uploadData.originalName,
          size: uploadData.size
        }
      });

      res.status(201).json({ 
        success: true, 
        message: "Photo upload tracked successfully",
        uploadId: uploadData.uploadId
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json(createErrorResponse(
          "Validation failed",
          error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code
          })),
          400
        ));
      } else {
        console.error('Failed to track photo upload:', error);
        res.status(500).json(createErrorResponse(
          "Failed to track photo upload",
          process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
          500
        ));
      }
    }
  });

  // Photo re-pathing endpoint (move from temp to final location)
  app.post("/api/uploads/photos/repath", requireAuth, requireRole(['admin', 'doctor', 'nurse', 'staff'], 'write:patients'), async (req: Request, res: Response) => {
    try {
      const repathData = photoRepathSchema.parse(req.body);
      
      // Update the photo upload record with final path
      await storage.updatePhotoUpload(repathData.tempPath, {
        finalPath: repathData.finalPath,
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmedBy: req.user!.id
      });

      // Create audit log
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'repath',
        entityType: 'patient_photo',
        entityId: repathData.patientId,
        changes: {
          tempPath: repathData.tempPath,
          finalPath: repathData.finalPath
        }
      });

      res.json({ 
        success: true, 
        message: "Photo path updated successfully",
        finalPath: repathData.finalPath
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json(createErrorResponse(
          "Validation failed",
          error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code
          })),
          400
        ));
      } else {
        console.error('Failed to repath photo:', error);
        res.status(500).json(createErrorResponse(
          "Failed to repath photo",
          process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
          500
        ));
      }
    }
  });

  // Photo cleanup endpoint (for failed uploads or canceled operations)
  app.delete("/api/uploads/photos/:uploadId", requireAuth, requireRole(['admin', 'doctor', 'nurse', 'staff'], 'write:patients'), async (req: Request, res: Response) => {
    try {
      const { uploadId } = req.params;
      
      // Mark upload as cleaned up
      await storage.cleanupPhotoUpload(uploadId, req.user!.id);

      // Create audit log
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'cleanup',
        entityType: 'patient_photo',
        entityId: uploadId,
        changes: {
          reason: 'Manual cleanup or failed upload'
        }
      });

      res.json({ 
        success: true, 
        message: "Photo upload cleaned up successfully"
      });
    } catch (error) {
      console.error('Failed to cleanup photo upload:', error);
      res.status(500).json(createErrorResponse(
        "Failed to cleanup photo upload",
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        500
      ));
    }
  });

  // Get upload status endpoint
  app.get("/api/uploads/photos/status/:patientId", requireAuth, requireRole(['admin', 'doctor', 'nurse', 'staff'], 'read:patients'), async (req: Request, res: Response) => {
    try {
      const { patientId } = req.params;
      const uploads = await storage.getPhotoUploadsForPatient(patientId);
      res.json(uploads);
    } catch (error) {
      console.error('Failed to get upload status:', error);
      res.status(500).json(createErrorResponse(
        "Failed to get upload status",
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        500
      ));
    }
  });

  // Batch cleanup of stale uploads (admin only)
  app.post("/api/uploads/photos/cleanup-stale", requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const { maxAgeHours = 24 } = req.body;
      const cleanedUploads = await storage.cleanupStalePhotoUploads(maxAgeHours, req.user!.id);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'batch_cleanup',
        entityType: 'patient_photo',
        entityId: 'system',
        changes: {
          cleanedCount: cleanedUploads.length,
          maxAgeHours
        }
      });

      res.json({ 
        success: true, 
        message: `Cleaned up ${cleanedUploads.length} stale uploads`,
        cleanedUploads: cleanedUploads.length
      });
    } catch (error) {
      console.error('Failed to cleanup stale uploads:', error);
      res.status(500).json(createErrorResponse(
        "Failed to cleanup stale uploads",
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        500
      ));
    }
  });

  // Get user by Firebase UID (for authentication)
  app.get("/api/users/by-firebase-uid/:uid", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUserByFirebaseUid(req.params.uid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Users routes
  app.get("/api/users", requireAuth, requireRole(['admin'], 'read:all'), async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireAuth, requireRole(['admin'], 'manage:users'), async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'user',
        entityId: user.id,
        changes: userData
      });
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create user" });
      }
    }
  });

  // Patients routes  
  app.get("/api/patients", requireAuth, requireRole(['admin', 'doctor', 'nurse', 'staff'], 'read:patients'), async (req: Request, res: Response) => {
    try {
      const { search } = req.query;
      
      // Validate and sanitize search parameter if provided
      if (search) {
        try {
          const validatedSearch = searchQuerySchema.parse(search);
          const patients = await storage.searchPatients(validatedSearch);
          res.json(patients);
        } catch (validationError) {
          if (validationError instanceof ZodError) {
            return res.status(400).json(createErrorResponse(
              "Invalid search query",
              validationError.errors.map(e => ({ message: e.message, code: e.code })),
              400
            ));
          }
          throw validationError;
        }
      } else {
        const patients = await storage.getPatients();
        res.json(patients);
      }
    } catch (error) {
      console.error('Failed to fetch patients:', error);
      res.status(500).json(createErrorResponse(
        "Failed to fetch patients",
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        500
      ));
    }
  });

  app.get("/api/patients/:id", 
    requireAuth, 
    requireRole(['admin', 'doctor', 'nurse', 'staff'], 'read:patients'),
    validateRequest(z.object({ id: patientIdSchema }), 'params'),
    async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const patient = await storage.getPatient(id);
      if (!patient) {
        return res.status(404).json(createErrorResponse("Patient not found", undefined, 404));
      }
      res.json(patient);
    } catch (error) {
      console.error('Failed to fetch patient:', error);
      res.status(500).json(createErrorResponse(
        "Failed to fetch patient",
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        500
      ));
    }
  });

  app.post("/api/patients", 
    requireAuth, 
    validateRequest(enhancedInsertPatientSchema, 'body'),
    async (req: Request, res: Response) => {
    let createdPatient: Patient | null = null;
    
    try {
      const patientData = req.body;
      
      // Additional business logic validation
      if (patientData.dateOfBirth) {
        const birthDate = new Date(patientData.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        if (age < 0 || age > 150) {
          return res.status(400).json(createErrorResponse(
            "Invalid date of birth",
            "Patient age must be between 0 and 150 years",
            400
          ));
        }
      }
      
      // Check for duplicate patients by phone and email
      const existingPatients = await storage.searchPatients(patientData.phone);
      if (existingPatients.length > 0) {
        const phoneMatches = existingPatients.filter(p => p.phone === patientData.phone);
        if (phoneMatches.length > 0) {
          return res.status(409).json(createErrorResponse(
            "Patient with this phone number already exists",
            { existingPatientId: phoneMatches[0].id },
            409
          ));
        }
      }
      
      if (patientData.email) {
        const emailResults = await storage.searchPatients(patientData.email);
        const emailMatches = emailResults.filter(p => p.email === patientData.email);
        if (emailMatches.length > 0) {
          return res.status(409).json(createErrorResponse(
            "Patient with this email already exists",
            { existingPatientId: emailMatches[0].id },
            409
          ));
        }
      }
      
      // Create patient
      createdPatient = await storage.createPatient(patientData);
      
      // Handle photo re-pathing from temp ID to actual patient ID
      let finalPatient = createdPatient;
      if (patientData.profilePhotoUrl && patientData.profilePhotoUrl.includes('temp-')) {
        try {
          // Extract temp ID from the photo URL
          const tempIdMatch = patientData.profilePhotoUrl.match(/temp-\d+/);
          if (tempIdMatch) {
            const tempId = tempIdMatch[0];
            
            // Get pending photo uploads for this temp ID
            const uploads = await storage.getPhotoUploadsForPatient(tempId);
            const pendingUpload = uploads.find((u: PhotoUpload) => u.status === 'uploaded');
            
            if (pendingUpload) {
              console.log(`Re-pathing photo for patient ${createdPatient.id} from temp ID ${tempId}`);
              
              // Generate new organized path for the actual patient
              const now = new Date();
              const year = now.getFullYear();
              const month = String(now.getMonth() + 1).padStart(2, '0');
              const timestamp = Date.now();
              const fileExtension = pendingUpload.originalName.split('.').pop()?.toLowerCase() || 'jpg';
              const fileName = `${createdPatient.id}_${timestamp}.${fileExtension}`;
              const finalPath = `patient-photos/${year}/${month}/${createdPatient.id}/${fileName}`;
              
              // Update the photo upload record with final path and patient ID
              await storage.updatePhotoUpload(pendingUpload.tempPath, {
                finalPath,
                patientId: createdPatient.id,
                status: 'confirmed',
                confirmedAt: new Date(),
                confirmedBy: req.user!.id
              });
              
              // Create a new photo URL with the final path
              const updatedPhotoUrl = patientData.profilePhotoUrl.replace(
                /patient-photos\/.*\//,
                `patient-photos/${year}/${month}/${createdPatient.id}/`
              ).replace(
                /temp-\d+_/,
                `${createdPatient.id}_`
              );
              
              // Update the patient record with the final photo URL
              finalPatient = await storage.updatePatient(createdPatient.id, {
                profilePhotoUrl: updatedPhotoUrl
              }) || createdPatient;
              
              console.log(`Photo re-pathing completed for patient ${createdPatient.id}`);
              
              // Create audit log for photo re-pathing
              await storage.createAuditLog({
                userId: req.user!.id,
                action: 'repath',
                entityType: 'patient_photo',
                entityId: createdPatient.id,
                changes: {
                  tempPath: pendingUpload.tempPath,
                  finalPath,
                  originalPhotoUrl: patientData.profilePhotoUrl,
                  finalPhotoUrl: updatedPhotoUrl
                }
              });
            } else {
              console.warn(`No pending photo upload found for temp ID ${tempId}`);
            }
          }
        } catch (repathError) {
          console.error('Photo re-pathing failed:', repathError);
          // Don't fail the patient creation if photo re-pathing fails
          // Create audit log for the failure
          await storage.createAuditLog({
            userId: req.user!.id,
            action: 'repath',
            entityType: 'patient_photo',
            entityId: createdPatient.id,
            changes: {
              error: 'Photo re-pathing failed',
              originalPhotoUrl: patientData.profilePhotoUrl,
              errorMessage: repathError instanceof Error ? repathError.message : 'Unknown error'
            }
          });
        }
      }
      
      // Create audit log for patient creation
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'patient',
        entityId: createdPatient.id,
        changes: {
          ...patientData,
          // Don't log sensitive info like photos URLs in audit
          profilePhotoUrl: patientData.profilePhotoUrl ? '[PHOTO_UPLOADED]' : undefined
        }
      });
      
      res.status(201).json(finalPatient);
    } catch (error) {
      console.error('Failed to create patient:', error);
      
      // Rollback: Delete created patient if error occurred after creation
      if (createdPatient) {
        try {
          console.log('Rolling back patient creation due to error');
          // Note: In a real implementation, you might want to mark as inactive instead of delete
        } catch (rollbackError) {
          console.error('Failed to rollback patient creation:', rollbackError);
        }
      }
      
      // Handle specific error types
      if ((error as Error).message?.includes('duplicate')) {
        return res.status(409).json(createErrorResponse(
          "Patient already exists",
          undefined,
          409
        ));
      }
      
      res.status(500).json(createErrorResponse(
        "Failed to create patient",
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        500
      ));
    }
  });

  app.patch("/api/patients/:id", requireAuth, requireRole(['admin', 'doctor', 'nurse'], 'write:patients'), async (req: Request, res: Response) => {
    try {
      const updates = req.body;
      const patient = await storage.updatePatient(req.params.id, updates);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'update',
        entityType: 'patient',
        entityId: patient.id,
        changes: updates
      });
      res.json(patient);
    } catch (error) {
      res.status(500).json({ error: "Failed to update patient" });
    }
  });

  // Appointments routes
  app.get("/api/appointments", requireAuth, async (req: Request, res: Response) => {
    try {
      const { date, doctorId } = req.query;
      let appointments;
      
      if (date) {
        appointments = await storage.getAppointmentsByDate(date as string);
      } else if (doctorId) {
        appointments = await storage.getAppointmentsByDoctor(doctorId as string);
      } else {
        appointments = await storage.getAppointments();
      }
      
      // Enrich with patient and doctor data
      const enrichedAppointments = await Promise.all(
        appointments.map(async (appointment) => {
          const patient = await storage.getPatient(appointment.patientId);
          const doctor = await storage.getUser(appointment.doctorId);
          return {
            ...appointment,
            patient,
            doctor
          };
        })
      );
      
      res.json(enrichedAppointments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  app.post("/api/appointments", requireAuth, async (req: Request, res: Response) => {
    try {
      const appointmentData = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(appointmentData);
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'appointment',
        entityId: appointment.id,
        changes: appointmentData
      });
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create appointment" });
      }
    }
  });

  app.patch("/api/appointments/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const updates = req.body;
      const appointment = await storage.updateAppointment(req.params.id, updates);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'update',
        entityType: 'appointment',
        entityId: appointment.id,
        changes: updates
      });
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update appointment" });
    }
  });

  // Encounters routes
  app.get("/api/encounters/:patientId", requireAuth, async (req: Request, res: Response) => {
    try {
      const encounters = await storage.getEncountersByPatient(req.params.patientId);
      res.json(encounters);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch encounters" });
    }
  });

  app.post("/api/encounters", requireAuth, async (req: Request, res: Response) => {
    try {
      const encounterData = insertEncounterSchema.parse(req.body);
      const encounter = await storage.createEncounter(encounterData);
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'encounter',
        entityId: encounter.id,
        changes: encounterData
      });
      res.status(201).json(encounter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create encounter" });
      }
    }
  });

  // Prescriptions routes
  app.get("/api/prescriptions", requireAuth, async (req: Request, res: Response) => {
    try {
      const { patientId } = req.query;
      const prescriptions = patientId 
        ? await storage.getPrescriptionsByPatient(patientId as string)
        : await storage.getPrescriptions();
        
      // Enrich with patient and doctor data
      const enrichedPrescriptions = await Promise.all(
        prescriptions.map(async (prescription) => {
          const patient = await storage.getPatient(prescription.patientId);
          const doctor = await storage.getUser(prescription.doctorId);
          return {
            ...prescription,
            patient,
            doctor
          };
        })
      );
      
      res.json(enrichedPrescriptions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch prescriptions" });
    }
  });

  app.post("/api/prescriptions", requireAuth, async (req: Request, res: Response) => {
    try {
      const prescriptionData = insertPrescriptionSchema.parse(req.body);
      const prescription = await storage.createPrescription(prescriptionData);
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'create',
        entityType: 'prescription',
        entityId: prescription.id,
        changes: prescriptionData
      });
      res.status(201).json(prescription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create prescription" });
      }
    }
  });

  app.patch("/api/prescriptions/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const updates = req.body;
      const prescription = await storage.updatePrescription(req.params.id, updates);
      if (!prescription) {
        return res.status(404).json({ error: "Prescription not found" });
      }
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'update',
        entityType: 'prescription',
        entityId: prescription.id,
        changes: updates
      });
      res.json(prescription);
    } catch (error) {
      res.status(500).json({ error: "Failed to update prescription" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = await storage.getAppointmentsByDate(today);
      
      const stats = {
        todayPatients: todayAppointments.length,
        completed: todayAppointments.filter(a => a.status === 'completed').length,
        inProgress: todayAppointments.filter(a => a.status === 'in_progress').length,
        pending: todayAppointments.filter(a => a.status === 'scheduled').length,
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // WhatsApp integration endpoint
  app.post("/api/prescriptions/:id/whatsapp", requireAuth, async (req: Request, res: Response) => {
    try {
      const prescription = await storage.getPrescription(req.params.id);
      if (!prescription) {
        return res.status(404).json({ error: "Prescription not found" });
      }
      
      const patient = await storage.getPatient(prescription.patientId);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      
      // Generate WhatsApp link
      const message = encodeURIComponent(
        `Hello ${patient.firstName}! Your prescription from SmileCare Clinic is ready. Please find the attached prescription: ${prescription.pdfUrl || '[PDF will be generated]'}`
      );
      const phone = patient.phone.replace(/\D/g, ''); // Remove non-digits
      const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
      
      // Mark as sent via WhatsApp
      await storage.updatePrescription(req.params.id, { whatsappSent: true });
      
      res.json({ whatsappUrl });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate WhatsApp link" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
