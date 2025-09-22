import { 
  type User, 
  type InsertUser, 
  type Patient, 
  type InsertPatient,
  type Appointment,
  type InsertAppointment,
  type Encounter,
  type InsertEncounter,
  type Prescription,
  type InsertPrescription,
  type AuditLog,
  type InsertAuditLog
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  
  // Patients
  getPatient(id: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | undefined>;
  getPatients(): Promise<Patient[]>;
  searchPatients(query: string): Promise<Patient[]>;
  
  // Appointments
  getAppointment(id: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | undefined>;
  getAppointments(): Promise<Appointment[]>;
  getAppointmentsByDate(date: string): Promise<Appointment[]>;
  getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]>;
  
  // Encounters
  getEncounter(id: string): Promise<Encounter | undefined>;
  createEncounter(encounter: InsertEncounter): Promise<Encounter>;
  updateEncounter(id: string, updates: Partial<Encounter>): Promise<Encounter | undefined>;
  getEncountersByPatient(patientId: string): Promise<Encounter[]>;
  
  // Prescriptions
  getPrescription(id: string): Promise<Prescription | undefined>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  updatePrescription(id: string, updates: Partial<Prescription>): Promise<Prescription | undefined>;
  getPrescriptions(): Promise<Prescription[]>;
  getPrescriptionsByPatient(patientId: string): Promise<Prescription[]>;
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(): Promise<AuditLog[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private patients: Map<string, Patient> = new Map();
  private appointments: Map<string, Appointment> = new Map();
  private encounters: Map<string, Encounter> = new Map();
  private prescriptions: Map<string, Prescription> = new Map();
  private auditLogs: Map<string, AuditLog> = new Map();

  constructor() {
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample admin user
    const adminUser: User = {
      id: randomUUID(),
      firebaseUid: "admin-firebase-uid",
      email: "admin@smilecare.com",
      name: "Dr. Admin User",
      role: "admin",
      specialization: null,
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

    // Sample doctors
    const doctor1: User = {
      id: randomUUID(),
      firebaseUid: "doctor1-firebase-uid",
      email: "dr.smith@smilecare.com",
      name: "Dr. Smith",
      role: "doctor",
      specialization: "General Dentistry",
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(doctor1.id, doctor1);

    const doctor2: User = {
      id: randomUUID(),
      firebaseUid: "doctor2-firebase-uid",
      email: "dr.johnson@smilecare.com",
      name: "Dr. Johnson",
      role: "doctor",
      specialization: "Oral Surgery",
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(doctor2.id, doctor2);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.firebaseUid === firebaseUid);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      specialization: insertUser.specialization || null,
      isActive: insertUser.isActive ?? true,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Patients
  async getPatient(id: string): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = randomUUID();
    const patient: Patient = { 
      ...insertPatient, 
      id, 
      email: insertPatient.email || null,
      address: insertPatient.address || null,
      gender: insertPatient.gender || null,
      emergencyContact: insertPatient.emergencyContact || null,
      medicalHistory: insertPatient.medicalHistory || null,
      allergies: insertPatient.allergies || null,
      profilePhotoUrl: insertPatient.profilePhotoUrl || null,
      communicationPreferences: insertPatient.communicationPreferences || null,
      createdAt: new Date() 
    };
    this.patients.set(id, patient);
    return patient;
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | undefined> {
    const patient = this.patients.get(id);
    if (!patient) return undefined;
    const updatedPatient = { ...patient, ...updates };
    this.patients.set(id, updatedPatient);
    return updatedPatient;
  }

  async getPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values());
  }

  async searchPatients(query: string): Promise<Patient[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.patients.values()).filter(patient =>
      patient.firstName.toLowerCase().includes(lowercaseQuery) ||
      patient.lastName.toLowerCase().includes(lowercaseQuery) ||
      patient.phone.includes(query) ||
      (patient.email && patient.email.toLowerCase().includes(lowercaseQuery))
    );
  }

  // Appointments
  async getAppointment(id: string): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const id = randomUUID();
    const appointment: Appointment = { 
      ...insertAppointment, 
      id, 
      duration: insertAppointment.duration || null,
      status: insertAppointment.status || null,
      notes: insertAppointment.notes || null,
      createdAt: new Date() 
    };
    this.appointments.set(id, appointment);
    return appointment;
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | undefined> {
    const appointment = this.appointments.get(id);
    if (!appointment) return undefined;
    const updatedAppointment = { ...appointment, ...updates };
    this.appointments.set(id, updatedAppointment);
    return updatedAppointment;
  }

  async getAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values());
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    const targetDate = new Date(date);
    return Array.from(this.appointments.values()).filter(appointment => {
      const appointmentDate = new Date(appointment.scheduledAt);
      return appointmentDate.toDateString() === targetDate.toDateString();
    });
  }

  async getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(appointment => 
      appointment.doctorId === doctorId
    );
  }

  // Encounters
  async getEncounter(id: string): Promise<Encounter | undefined> {
    return this.encounters.get(id);
  }

  async createEncounter(insertEncounter: InsertEncounter): Promise<Encounter> {
    const id = randomUUID();
    const encounter: Encounter = { 
      ...insertEncounter, 
      id, 
      chiefComplaint: insertEncounter.chiefComplaint || null,
      clinicalNotes: insertEncounter.clinicalNotes || null,
      diagnosis: insertEncounter.diagnosis || null,
      treatmentPlan: insertEncounter.treatmentPlan || null,
      uploadedFiles: insertEncounter.uploadedFiles || null,
      vitals: insertEncounter.vitals || null,
      createdAt: new Date() 
    };
    this.encounters.set(id, encounter);
    return encounter;
  }

  async updateEncounter(id: string, updates: Partial<Encounter>): Promise<Encounter | undefined> {
    const encounter = this.encounters.get(id);
    if (!encounter) return undefined;
    const updatedEncounter = { ...encounter, ...updates };
    this.encounters.set(id, updatedEncounter);
    return updatedEncounter;
  }

  async getEncountersByPatient(patientId: string): Promise<Encounter[]> {
    return Array.from(this.encounters.values()).filter(encounter => 
      encounter.patientId === patientId
    );
  }

  // Prescriptions
  async getPrescription(id: string): Promise<Prescription | undefined> {
    return this.prescriptions.get(id);
  }

  async createPrescription(insertPrescription: InsertPrescription): Promise<Prescription> {
    const id = randomUUID();
    const prescription: Prescription = { 
      ...insertPrescription, 
      id, 
      medications: insertPrescription.medications || null,
      pdfUrl: insertPrescription.pdfUrl || null,
      emailSent: insertPrescription.emailSent || null,
      whatsappSent: insertPrescription.whatsappSent || null,
      createdAt: new Date() 
    };
    this.prescriptions.set(id, prescription);
    return prescription;
  }

  async updatePrescription(id: string, updates: Partial<Prescription>): Promise<Prescription | undefined> {
    const prescription = this.prescriptions.get(id);
    if (!prescription) return undefined;
    const updatedPrescription = { ...prescription, ...updates };
    this.prescriptions.set(id, updatedPrescription);
    return updatedPrescription;
  }

  async getPrescriptions(): Promise<Prescription[]> {
    return Array.from(this.prescriptions.values());
  }

  async getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    return Array.from(this.prescriptions.values()).filter(prescription => 
      prescription.patientId === patientId
    );
  }

  // Audit Logs
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const log: AuditLog = { 
      ...insertLog, 
      id, 
      changes: insertLog.changes || null,
      createdAt: new Date() 
    };
    this.auditLogs.set(id, log);
    return log;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }
}

export const storage = new MemStorage();
