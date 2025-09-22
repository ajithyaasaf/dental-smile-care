import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users (Admin, Doctor, Staff)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firebaseUid: text("firebase_uid").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(), // 'admin', 'doctor', 'staff'
  specialization: text("specialization"), // For doctors
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Patients
export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  gender: text("gender"), // 'male', 'female', 'other'
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  emergencyContact: jsonb("emergency_contact"), // {name, phone, relationship}
  medicalHistory: text("medical_history"),
  allergies: text("allergies"),
  profilePhotoUrl: text("profile_photo_url"),
  communicationPreferences: jsonb("communication_preferences"), // {email: boolean, whatsapp: boolean}
  createdAt: timestamp("created_at").defaultNow(),
});

// Appointments
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  doctorId: varchar("doctor_id").references(() => users.id).notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(30), // minutes
  appointmentType: text("appointment_type").notNull(), // 'routine', 'emergency', 'followup'
  status: text("status").default('scheduled'), // 'scheduled', 'in_progress', 'completed', 'cancelled'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Medical Encounters
export const encounters = pgTable("encounters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").references(() => appointments.id).notNull(),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  doctorId: varchar("doctor_id").references(() => users.id).notNull(),
  chiefComplaint: text("chief_complaint"),
  clinicalNotes: text("clinical_notes"),
  diagnosis: text("diagnosis"),
  treatmentPlan: text("treatment_plan"),
  uploadedFiles: jsonb("uploaded_files"), // array of file URLs
  vitals: jsonb("vitals"), // {bloodPressure, heartRate, etc}
  createdAt: timestamp("created_at").defaultNow(),
});

// Prescriptions
export const prescriptions = pgTable("prescriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  encounterId: varchar("encounter_id").references(() => encounters.id).notNull(),
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  doctorId: varchar("doctor_id").references(() => users.id).notNull(),
  medications: jsonb("medications"), // array of {name, dosage, frequency, duration, instructions}
  pdfUrl: text("pdf_url"),
  emailSent: boolean("email_sent").default(false),
  whatsappSent: boolean("whatsapp_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // 'create', 'update', 'delete'
  entityType: text("entity_type").notNull(), // 'patient', 'appointment', 'prescription'
  entityId: varchar("entity_id").notNull(),
  changes: jsonb("changes"), // before/after values
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});

export const insertEncounterSchema = createInsertSchema(encounters).omit({
  id: true,
  createdAt: true,
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Encounter = typeof encounters.$inferSelect;
export type InsertEncounter = z.infer<typeof insertEncounterSchema>;
export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
