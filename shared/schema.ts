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
  createdAt: z.date(),
});

// Firestore Appointments Collection Schema
export const appointmentSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  scheduledAt: z.date(),
  scheduledDate: z.string(), // YYYY-MM-DD for easier querying
  duration: z.number().default(30), // minutes
  appointmentType: z.enum(["routine", "emergency", "followup"]),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled"),
  notes: z.string().optional(),
  // Denormalized fields for list views
  patientName: z.string().optional(),
  doctorName: z.string().optional(),
  createdAt: z.date(),
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

// Firestore Audit Logs Collection Schema
export const auditLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  action: z.enum(["create", "update", "delete"]),
  entityType: z.enum(["user", "patient", "appointment", "encounter", "prescription"]),
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

export const insertAppointmentSchema = appointmentSchema.omit({
  id: true,
  createdAt: true,
  scheduledDate: true, // Auto-generated from scheduledAt
  patientName: true, // Auto-denormalized
  doctorName: true, // Auto-denormalized
});

export const insertEncounterSchema = encounterSchema.omit({
  id: true,
  createdAt: true,
});

export const insertPrescriptionSchema = prescriptionSchema.omit({
  id: true,
  createdAt: true,
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
export type Encounter = z.infer<typeof encounterSchema>;
export type InsertEncounter = z.infer<typeof insertEncounterSchema>;
export type Prescription = z.infer<typeof prescriptionSchema>;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Additional utility types
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;
export type CommunicationPreferences = z.infer<typeof communicationPreferencesSchema>;
export type Medication = z.infer<typeof medicationSchema>;
export type Vitals = z.infer<typeof vitalsSchema>;
