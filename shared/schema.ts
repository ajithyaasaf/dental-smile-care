import { z } from "zod";
import { Timestamp } from "firebase/firestore";

// Firestore Users Collection Schema
export const userSchema = z.object({
  id: z.string(), // Auto-generated Firestore document ID
  firebaseUid: z.string(),
  email: z.string().email(),
  emailLower: z.string().email(), // For case-insensitive queries
  name: z.string(),
  role: z.enum(["admin", "doctor", "staff"]),
  specialization: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
});

// Firestore Patients Collection Schema
export const emergencyContactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  relationship: z.string(),
});

export const communicationPreferencesSchema = z.object({
  email: z.boolean(),
  whatsapp: z.boolean(),
});

export const consentFormsSchema = z.object({
  treatmentConsent: z.boolean().default(false),
  privacyPolicyConsent: z.boolean().default(false),
  dataProcessingConsent: z.boolean().default(false),
  marketingConsent: z.boolean().default(false),
  consentDate: z.date().optional(),
});

export const patientSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(), // "firstName lastName" for search
  fullNameLower: z.string(), // Lowercase for search
  dateOfBirth: z.date(),
  gender: z.enum(["male", "female", "other"]).optional(),
  phone: z.string(),
  email: z.string().email().optional(),
  emailLower: z.string().email().optional(),
  address: z.string().optional(),
  emergencyContact: emergencyContactSchema.optional(),
  medicalHistory: z.string().optional(),
  allergies: z.string().optional(),
  profilePhotoUrl: z.string().url().optional(),
  communicationPreferences: communicationPreferencesSchema.optional(),
  consentForms: consentFormsSchema.optional(),
  createdAt: z.date(),
});

// Firestore Doctor Availability Collection Schema
export const timeSlotSchema = z.object({
  start: z.string(), // HH:mm format (e.g., "09:00")
  end: z.string(), // HH:mm format (e.g., "17:00")
});

export const doctorAvailabilitySchema = z.object({
  id: z.string(),
  doctorId: z.string(),
  dayOfWeek: z.number().min(0).max(6), // 0 = Sunday, 6 = Saturday
  timeSlots: z.array(timeSlotSchema),
  isActive: z.boolean().default(true),
  effectiveFrom: z.date(),
  effectiveTo: z.date().optional(), // null means indefinite
  createdAt: z.date(),
});

export const doctorTimeOffSchema = z.object({
  id: z.string(),
  doctorId: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  startTime: z.string().optional(), // HH:mm format for partial day off
  endTime: z.string().optional(), // HH:mm format for partial day off
  reason: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.enum(["weekly", "monthly", "yearly"]).optional(),
  createdAt: z.date(),
});

// Enhanced appointment types for better categorization and color coding
export const appointmentTypeSchema = z.enum([
  "consultation", 
  "cleaning", 
  "checkup", 
  "surgery", 
  "emergency", 
  "followup", 
  "routine", 
  "orthodontics", 
  "cosmetic", 
  "extraction", 
  "root_canal", 
  "filling"
]);

// Appointment priority for scheduling conflicts
export const appointmentPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);

// Firestore Appointments Collection Schema (Enhanced)
export const appointmentSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  scheduledAt: z.date(),
  scheduledDate: z.string(), // YYYY-MM-DD for easier querying
  duration: z.number().default(30), // minutes
  appointmentType: appointmentTypeSchema,
  priority: appointmentPrioritySchema.default("normal"),
  status: z.enum(["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"]).default("scheduled"),
  notes: z.string().optional(),
  reminderSent: z.boolean().default(false),
  confirmationRequired: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.enum(["weekly", "monthly"]).optional(),
  parentAppointmentId: z.string().optional(), // For recurring appointments
  // Denormalized fields for list views and conflict detection
  patientName: z.string().optional(),
  doctorName: z.string().optional(),
  endTime: z.date().optional(), // Computed: scheduledAt + duration
  // Conflict detection fields
  hasConflict: z.boolean().default(false),
  conflictReason: z.string().optional(),
  suggestedAlternatives: z.array(z.object({
    doctorId: z.string(),
    doctorName: z.string(),
    suggestedTime: z.date(),
    reason: z.string(),
  })).optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

// Firestore Encounters Collection Schema
export const vitalsSchema = z.object({
  bloodPressure: z.string().optional(),
  heartRate: z.number().optional(),
  temperature: z.number().optional(),
  weight: z.number().optional(),
  height: z.number().optional(),
});

export const encounterSchema = z.object({
  id: z.string(),
  appointmentId: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  chiefComplaint: z.string().optional(),
  clinicalNotes: z.string().optional(),
  diagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
  uploadedFiles: z.array(z.string().url()).optional(), // Firebase Storage URLs
  vitals: vitalsSchema.optional(),
  createdAt: z.date(),
});

// Firestore Prescriptions Collection Schema
export const medicationSchema = z.object({
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  instructions: z.string().optional(),
});

export const prescriptionSchema = z.object({
  id: z.string(),
  encounterId: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  medications: z.array(medicationSchema),
  pdfUrl: z.string().url().optional(),
  emailSent: z.boolean().default(false),
  whatsappSent: z.boolean().default(false),
  createdAt: z.date(),
});

// Photo Upload Tracking Schema
export const photoUploadSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  tempPath: z.string(),
  finalPath: z.string().optional(),
  originalName: z.string(),
  size: z.number(),
  contentType: z.string(),
  uploadId: z.string(),
  uploadedBy: z.string(),
  uploadedAt: z.date(),
  confirmedBy: z.string().optional(),
  confirmedAt: z.date().optional(),
  cleanedUpBy: z.string().optional(),
  cleanedUpAt: z.date().optional(),
  status: z.enum(["uploaded", "confirmed", "cleaned_up", "failed"]),
  metadata: z.record(z.any()).optional(),
});

// Firestore Audit Logs Collection Schema
export const auditLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  action: z.enum(["create", "update", "delete", "upload", "repath", "cleanup", "batch_cleanup"]),
  entityType: z.enum(["user", "patient", "appointment", "encounter", "prescription", "patient_photo"]),
  entityId: z.string(),
  changes: z.record(z.any()).optional(), // before/after values
  createdAt: z.date(),
});

// Insert schemas (for creating new documents)
export const insertUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
  emailLower: true, // Auto-generated from email
});

export const insertPatientSchema = patientSchema.omit({
  id: true,
  createdAt: true,
  fullName: true, // Auto-generated from firstName + lastName
  fullNameLower: true, // Auto-generated from fullName
  emailLower: true, // Auto-generated from email if provided
});

export const insertDoctorAvailabilitySchema = doctorAvailabilitySchema.omit({
  id: true,
  createdAt: true,
});

export const insertDoctorTimeOffSchema = doctorTimeOffSchema.omit({
  id: true,
  createdAt: true,
});

export const insertAppointmentSchema = appointmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  scheduledDate: true, // Auto-generated from scheduledAt
  patientName: true, // Auto-denormalized
  doctorName: true, // Auto-denormalized
  endTime: true, // Auto-computed
  hasConflict: true, // Auto-computed
  conflictReason: true, // Auto-computed
  suggestedAlternatives: true, // Auto-computed
});

export const insertEncounterSchema = encounterSchema.omit({
  id: true,
  createdAt: true,
});

export const insertPrescriptionSchema = prescriptionSchema.omit({
  id: true,
  createdAt: true,
});

export const insertPhotoUploadSchema = photoUploadSchema.omit({
  id: true,
});

export const insertAuditLogSchema = auditLogSchema.omit({
  id: true,
  createdAt: true,
});

// TypeScript types
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Patient = z.infer<typeof patientSchema>;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Appointment = z.infer<typeof appointmentSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type DoctorAvailability = z.infer<typeof doctorAvailabilitySchema>;
export type InsertDoctorAvailability = z.infer<typeof insertDoctorAvailabilitySchema>;
export type DoctorTimeOff = z.infer<typeof doctorTimeOffSchema>;
export type InsertDoctorTimeOff = z.infer<typeof insertDoctorTimeOffSchema>;
export type Encounter = z.infer<typeof encounterSchema>;
export type InsertEncounter = z.infer<typeof insertEncounterSchema>;
export type Prescription = z.infer<typeof prescriptionSchema>;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type PhotoUpload = z.infer<typeof photoUploadSchema>;
export type InsertPhotoUpload = z.infer<typeof insertPhotoUploadSchema>;

// Additional utility types
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;
export type CommunicationPreferences = z.infer<typeof communicationPreferencesSchema>;
export type ConsentForms = z.infer<typeof consentFormsSchema>;
export type Medication = z.infer<typeof medicationSchema>;
export type Vitals = z.infer<typeof vitalsSchema>;
export type TimeSlot = z.infer<typeof timeSlotSchema>;
export type AppointmentType = z.infer<typeof appointmentTypeSchema>;
export type AppointmentPriority = z.infer<typeof appointmentPrioritySchema>;

// Enterprise scheduling utility types
export interface AppointmentConflict {
  appointmentId: string;
  conflictType: 'time_overlap' | 'doctor_unavailable' | 'double_booking' | 'time_off';
  conflictingAppointmentId?: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface AvailabilitySlot {
  doctorId: string;
  doctorName: string;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  conflictReason?: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface DoctorScheduleInfo {
  doctorId: string;
  doctorName: string;
  specialization?: string;
  isAvailable: boolean;
  currentStatus: 'available' | 'busy' | 'off' | 'break';
  nextAvailableSlot?: Date;
  appointments: Appointment[];
  timeOff: DoctorTimeOff[];
}

// Color coding configuration for appointment types
export const APPOINTMENT_TYPE_COLORS: Record<AppointmentType, string> = {
  consultation: '#3B82F6', // Blue
  cleaning: '#10B981', // Green
  checkup: '#06B6D4', // Cyan
  surgery: '#EF4444', // Red
  emergency: '#DC2626', // Dark Red
  followup: '#8B5CF6', // Purple
  routine: '#6B7280', // Gray
  orthodontics: '#F59E0B', // Orange
  cosmetic: '#EC4899', // Pink
  extraction: '#DC2626', // Dark Red
  root_canal: '#B91C1C', // Darker Red
  filling: '#059669', // Dark Green
};

// Priority colors
export const APPOINTMENT_PRIORITY_COLORS: Record<AppointmentPriority, string> = {
  low: '#6B7280', // Gray
  normal: '#3B82F6', // Blue
  high: '#F59E0B', // Orange
  urgent: '#EF4444', // Red
};
