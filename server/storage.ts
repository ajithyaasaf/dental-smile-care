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
import { db } from "./firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

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

// Utility functions for Firestore timestamp conversion
const convertTimestampsToDate = (data: any): any => {
  if (!data) return data;
  if (data instanceof Timestamp) {
    return data.toDate();
  }
  if (Array.isArray(data)) {
    return data.map(convertTimestampsToDate);
  }
  if (typeof data === 'object' && data !== null) {
    const converted: any = {};
    for (const [key, value] of Object.entries(data)) {
      converted[key] = convertTimestampsToDate(value);
    }
    return converted;
  }
  return data;
};

const convertDatesToTimestamp = (data: any): any => {
  if (!data) return data;
  if (data instanceof Date) {
    return Timestamp.fromDate(data);
  }
  if (Array.isArray(data)) {
    return data.map(convertDatesToTimestamp);
  }
  if (typeof data === 'object' && data !== null) {
    const converted: any = {};
    for (const [key, value] of Object.entries(data)) {
      converted[key] = convertDatesToTimestamp(value);
    }
    return converted;
  }
  return data;
};

// Type guard to check if error has Firestore error properties
const isFirestoreError = (error: unknown): error is { code: string; message: string } => {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
};

// Error handling wrapper
const handleFirestoreError = (operation: string, error: unknown): Error => {
  console.error(`Firestore ${operation} error:`, error);
  if (isFirestoreError(error)) {
    if (error.code === 'permission-denied') {
      return new Error(`Permission denied: ${operation}`);
    }
    if (error.code === 'not-found') {
      return new Error(`Document not found: ${operation}`);
    }
    return new Error(`Firestore error during ${operation}: ${error.message}`);
  }
  return new Error(`Firestore error during ${operation}: ${error instanceof Error ? error.message : String(error)}`);
};

export class FirestoreStorage implements IStorage {
  // Collection names
  private readonly COLLECTIONS = {
    USERS: 'users',
    PATIENTS: 'patients', 
    APPOINTMENTS: 'appointments',
    ENCOUNTERS: 'encounters',
    PRESCRIPTIONS: 'prescriptions',
    AUDIT_LOGS: 'audit_logs'
  };

  constructor() {
    // Only initialize sample data in development with explicit flag
    if (process.env.NODE_ENV === 'development' && process.env.SEED_DATA === 'true') {
      this.initializeSampleData();
    }
  }

  private async initializeSampleData() {
    try {
      // Check if data already exists
      const usersSnapshot = await db.collection(this.COLLECTIONS.USERS).limit(1).get();
      if (!usersSnapshot.empty) {
        console.log('📦 Sample data already exists, skipping initialization');
        return; // Data already exists
      }

      const batch = db.batch();

      // Sample users
      const adminRef = db.collection(this.COLLECTIONS.USERS).doc();
      const adminUser: User = {
        id: adminRef.id,
        firebaseUid: "admin-firebase-uid",
        email: "admin@smilecare.com",
        emailLower: "admin@smilecare.com",
        name: "Dr. Admin User",
        role: "admin",
        isActive: true,
        createdAt: new Date(),
      };
      batch.set(adminRef, convertDatesToTimestamp(adminUser));

      const doctor1Ref = db.collection(this.COLLECTIONS.USERS).doc();
      const doctor1: User = {
        id: doctor1Ref.id,
        firebaseUid: "doctor1-firebase-uid",
        email: "dr.smith@smilecare.com",
        emailLower: "dr.smith@smilecare.com",
        name: "Dr. Smith",
        role: "doctor",
        specialization: "General Dentistry",
        isActive: true,
        createdAt: new Date(),
      };
      batch.set(doctor1Ref, convertDatesToTimestamp(doctor1));

      const doctor2Ref = db.collection(this.COLLECTIONS.USERS).doc();
      const doctor2: User = {
        id: doctor2Ref.id,
        firebaseUid: "doctor2-firebase-uid",
        email: "dr.johnson@smilecare.com",
        emailLower: "dr.johnson@smilecare.com",
        name: "Dr. Johnson",
        role: "doctor",
        specialization: "Oral Surgery",
        isActive: true,
        createdAt: new Date(),
      };
      batch.set(doctor2Ref, convertDatesToTimestamp(doctor2));

      const staffRef = db.collection(this.COLLECTIONS.USERS).doc();
      const staff: User = {
        id: staffRef.id,
        firebaseUid: "staff-firebase-uid",
        email: "staff@smilecare.com",
        emailLower: "staff@smilecare.com",
        name: "Staff Member",
        role: "staff",
        isActive: true,
        createdAt: new Date(),
      };
      batch.set(staffRef, convertDatesToTimestamp(staff));

      // Sample patients
      const patient1Ref = db.collection(this.COLLECTIONS.PATIENTS).doc();
      const patient1: Patient = {
        id: patient1Ref.id,
        firstName: "John",
        lastName: "Doe",
        fullName: "John Doe",
        fullNameLower: "john doe",
        dateOfBirth: new Date("1985-06-15"),
        gender: "male",
        phone: "+1234567890",
        email: "john.doe@email.com",
        emailLower: "john.doe@email.com",
        address: "123 Main St",
        medicalHistory: "No significant medical history",
        allergies: "None",
        communicationPreferences: { email: true, whatsapp: true },
        createdAt: new Date(),
      };
      batch.set(patient1Ref, convertDatesToTimestamp(patient1));

      const patient2Ref = db.collection(this.COLLECTIONS.PATIENTS).doc();
      const patient2: Patient = {
        id: patient2Ref.id,
        firstName: "Jane",
        lastName: "Smith",
        fullName: "Jane Smith",
        fullNameLower: "jane smith",
        dateOfBirth: new Date("1990-03-22"),
        gender: "female",
        phone: "+1234567891",
        email: "jane.smith@email.com",
        emailLower: "jane.smith@email.com",
        address: "456 Oak Ave",
        medicalHistory: "Diabetes Type 2",
        allergies: "Penicillin",
        communicationPreferences: { email: true, whatsapp: false },
        createdAt: new Date(),
      };
      batch.set(patient2Ref, convertDatesToTimestamp(patient2));

      // Sample appointments
      const today = new Date();
      const appointment1Ref = db.collection(this.COLLECTIONS.APPOINTMENTS).doc();
      const appointment1: Appointment = {
        id: appointment1Ref.id,
        patientId: patient1.id,
        doctorId: doctor1.id,
        scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
        scheduledDate: today.toISOString().split('T')[0],
        duration: 30,
        appointmentType: "routine",
        status: "scheduled",
        notes: "Regular checkup",
        patientName: patient1.fullName,
        doctorName: doctor1.name,
        createdAt: new Date(),
      };
      batch.set(appointment1Ref, convertDatesToTimestamp(appointment1));

      const appointment2Ref = db.collection(this.COLLECTIONS.APPOINTMENTS).doc();
      const appointment2: Appointment = {
        id: appointment2Ref.id,
        patientId: patient2.id,
        doctorId: doctor2.id,
        scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
        scheduledDate: today.toISOString().split('T')[0],
        duration: 60,
        appointmentType: "routine",
        status: "completed",
        notes: "Cleaning and examination",
        patientName: patient2.fullName,
        doctorName: doctor2.name,
        createdAt: new Date(),
      };
      batch.set(appointment2Ref, convertDatesToTimestamp(appointment2));

      // Sample prescription
      const prescriptionRef = db.collection(this.COLLECTIONS.PRESCRIPTIONS).doc();
      const prescription: Prescription = {
        id: prescriptionRef.id,
        encounterId: "encounter-1",
        patientId: patient1.id,
        doctorId: doctor1.id,
        medications: [
          {
            name: "Amoxicillin",
            dosage: "500mg",
            frequency: "3 times daily",
            duration: "7 days",
            instructions: "Take with food"
          }
        ],
        emailSent: true,
        whatsappSent: false,
        createdAt: new Date(),
      };
      batch.set(prescriptionRef, convertDatesToTimestamp(prescription));

      await batch.commit();
      console.log('📦 Firestore sample data initialized successfully');
    } catch (error) {
      console.error('Error initializing sample data:', error);
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    try {
      const doc = await db.collection(this.COLLECTIONS.USERS).doc(id).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data();
      return convertTimestampsToDate({ id: doc.id, ...data }) as User;
    } catch (error) {
      throw handleFirestoreError('getUser', error);
    }
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    try {
      const querySnapshot = await db.collection(this.COLLECTIONS.USERS)
        .where('firebaseUid', '==', firebaseUid)
        .limit(1)
        .get();
      
      if (querySnapshot.empty) return undefined;
      
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return convertTimestampsToDate({ id: doc.id, ...data }) as User;
    } catch (error) {
      throw handleFirestoreError('getUserByFirebaseUid', error);
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const docRef = db.collection(this.COLLECTIONS.USERS).doc();
      const user: User = {
        id: docRef.id,
        ...insertUser,
        emailLower: insertUser.email.toLowerCase(),
        isActive: insertUser.isActive ?? true,
        createdAt: new Date(),
      };
      
      await docRef.set(convertDatesToTimestamp(user));
      return user;
    } catch (error) {
      throw handleFirestoreError('createUser', error);
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    try {
      const docRef = db.collection(this.COLLECTIONS.USERS).doc(id);
      
      // Prepare update data with computed fields
      const updateData: any = { ...updates };
      if (updates.email) {
        updateData.emailLower = updates.email.toLowerCase();
      }
      
      await docRef.update(convertDatesToTimestamp(updateData));
      
      // Fetch and return the updated document
      const doc = await docRef.get();
      if (!doc.exists) return undefined;
      
      const data = doc.data();
      return convertTimestampsToDate({ id: doc.id, ...data }) as User;
    } catch (error) {
      if (isFirestoreError(error) && error.code === 'not-found') return undefined;
      throw handleFirestoreError('updateUser', error);
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      const querySnapshot = await db.collection(this.COLLECTIONS.USERS)
        .orderBy('createdAt', 'desc')
        .get();
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return convertTimestampsToDate({ id: doc.id, ...data }) as User;
      });
    } catch (error) {
      throw handleFirestoreError('getUsers', error);
    }
  }

  // Patients
  async getPatient(id: string): Promise<Patient | undefined> {
    try {
      const doc = await db.collection(this.COLLECTIONS.PATIENTS).doc(id).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data();
      return convertTimestampsToDate({ id: doc.id, ...data }) as Patient;
    } catch (error) {
      throw handleFirestoreError('getPatient', error);
    }
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    try {
      const docRef = db.collection(this.COLLECTIONS.PATIENTS).doc();
      const fullName = `${insertPatient.firstName} ${insertPatient.lastName}`;
      const patient: Patient = {
        id: docRef.id,
        ...insertPatient,
        fullName,
        fullNameLower: fullName.toLowerCase(),
        emailLower: insertPatient.email?.toLowerCase(),
        createdAt: new Date(),
      };
      
      await docRef.set(convertDatesToTimestamp(patient));
      return patient;
    } catch (error) {
      throw handleFirestoreError('createPatient', error);
    }
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | undefined> {
    try {
      const docRef = db.collection(this.COLLECTIONS.PATIENTS).doc(id);
      
      // For name updates, we need to get current data to compute fullName
      let updateData: any = { ...updates };
      
      if (updates.firstName || updates.lastName) {
        const doc = await docRef.get();
        if (!doc.exists) return undefined;
        
        const currentData = convertTimestampsToDate(doc.data()) as Patient;
        const firstName = updates.firstName || currentData.firstName;
        const lastName = updates.lastName || currentData.lastName;
        const fullName = `${firstName} ${lastName}`;
        
        updateData.fullName = fullName;
        updateData.fullNameLower = fullName.toLowerCase();
      }
      
      if (updates.email) {
        updateData.emailLower = updates.email.toLowerCase();
      }
      
      await docRef.update(convertDatesToTimestamp(updateData));
      
      // Fetch and return the updated document
      const doc = await docRef.get();
      if (!doc.exists) return undefined;
      
      const data = doc.data();
      return convertTimestampsToDate({ id: doc.id, ...data }) as Patient;
    } catch (error) {
      if (isFirestoreError(error) && error.code === 'not-found') return undefined;
      throw handleFirestoreError('updatePatient', error);
    }
  }

  async getPatients(): Promise<Patient[]> {
    try {
      const querySnapshot = await db.collection(this.COLLECTIONS.PATIENTS)
        .orderBy('createdAt', 'desc')
        .get();
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return convertTimestampsToDate({ id: doc.id, ...data }) as Patient;
      });
    } catch (error) {
      throw handleFirestoreError('getPatients', error);
    }
  }

  async searchPatients(query: string): Promise<Patient[]> {
    try {
      const lowercaseQuery = query.toLowerCase();
      
      // Firestore doesn't support full-text search, so we'll use array-contains-any for multiple field search
      // For better search, consider using Algolia or another search service
      const querySnapshot = await db.collection(this.COLLECTIONS.PATIENTS)
        .where('fullNameLower', '>=', lowercaseQuery)
        .where('fullNameLower', '<=', lowercaseQuery + '\uf8ff')
        .get();
      
      const phoneQuerySnapshot = await db.collection(this.COLLECTIONS.PATIENTS)
        .where('phone', '>=', query)
        .where('phone', '<=', query + '\uf8ff')
        .get();
      
      const results = new Map<string, Patient>();
      
      // Add name search results
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const patient = convertTimestampsToDate({ id: doc.id, ...data }) as Patient;
        results.set(doc.id, patient);
      });
      
      // Add phone search results
      phoneQuerySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const patient = convertTimestampsToDate({ id: doc.id, ...data }) as Patient;
        results.set(doc.id, patient);
      });
      
      // Also check email if provided (client-side filtering for email)
      if (query.includes('@')) {
        const emailQuerySnapshot = await db.collection(this.COLLECTIONS.PATIENTS)
          .where('emailLower', '>=', lowercaseQuery)
          .where('emailLower', '<=', lowercaseQuery + '\uf8ff')
          .get();
        
        emailQuerySnapshot.docs.forEach(doc => {
          const data = doc.data();
          const patient = convertTimestampsToDate({ id: doc.id, ...data }) as Patient;
          results.set(doc.id, patient);
        });
      }
      
      return Array.from(results.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      throw handleFirestoreError('searchPatients', error);
    }
  }

  // Appointments
  async getAppointment(id: string): Promise<Appointment | undefined> {
    try {
      const doc = await db.collection(this.COLLECTIONS.APPOINTMENTS).doc(id).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data();
      return convertTimestampsToDate({ id: doc.id, ...data }) as Appointment;
    } catch (error) {
      throw handleFirestoreError('getAppointment', error);
    }
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    try {
      const docRef = db.collection(this.COLLECTIONS.APPOINTMENTS).doc();
      const scheduledDate = new Date(insertAppointment.scheduledAt).toISOString().split('T')[0];
      
      const appointment: Appointment = {
        id: docRef.id,
        ...insertAppointment,
        scheduledDate,
        duration: insertAppointment.duration ?? 30,
        status: insertAppointment.status ?? "scheduled",
        createdAt: new Date(),
      };
      
      await docRef.set(convertDatesToTimestamp(appointment));
      return appointment;
    } catch (error) {
      throw handleFirestoreError('createAppointment', error);
    }
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | undefined> {
    try {
      const docRef = db.collection(this.COLLECTIONS.APPOINTMENTS).doc(id);
      
      // Prepare update data with computed fields
      const updateData: any = { ...updates };
      if (updates.scheduledAt) {
        updateData.scheduledDate = new Date(updates.scheduledAt).toISOString().split('T')[0];
      }
      
      await docRef.update(convertDatesToTimestamp(updateData));
      
      // Fetch and return the updated document
      const doc = await docRef.get();
      if (!doc.exists) return undefined;
      
      const data = doc.data();
      return convertTimestampsToDate({ id: doc.id, ...data }) as Appointment;
    } catch (error) {
      if (isFirestoreError(error) && error.code === 'not-found') return undefined;
      throw handleFirestoreError('updateAppointment', error);
    }
  }

  async getAppointments(): Promise<Appointment[]> {
    try {
      const querySnapshot = await db.collection(this.COLLECTIONS.APPOINTMENTS)
        .orderBy('scheduledAt', 'desc')
        .get();
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return convertTimestampsToDate({ id: doc.id, ...data }) as Appointment;
      });
    } catch (error) {
      throw handleFirestoreError('getAppointments', error);
    }
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    try {
      const querySnapshot = await db.collection(this.COLLECTIONS.APPOINTMENTS)
        .where('scheduledDate', '==', date)
        .orderBy('scheduledAt', 'asc')
        .get();
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return convertTimestampsToDate({ id: doc.id, ...data }) as Appointment;
      });
    } catch (error) {
      throw handleFirestoreError('getAppointmentsByDate', error);
    }
  }

  async getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
    try {
      const querySnapshot = await db.collection(this.COLLECTIONS.APPOINTMENTS)
        .where('doctorId', '==', doctorId)
        .orderBy('scheduledAt', 'asc')
        .get();
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return convertTimestampsToDate({ id: doc.id, ...data }) as Appointment;
      });
    } catch (error) {
      throw handleFirestoreError('getAppointmentsByDoctor', error);
    }
  }

  // Encounters
  async getEncounter(id: string): Promise<Encounter | undefined> {
    try {
      const doc = await db.collection(this.COLLECTIONS.ENCOUNTERS).doc(id).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data();
      return convertTimestampsToDate({ id: doc.id, ...data }) as Encounter;
    } catch (error) {
      throw handleFirestoreError('getEncounter', error);
    }
  }

  async createEncounter(insertEncounter: InsertEncounter): Promise<Encounter> {
    try {
      const docRef = db.collection(this.COLLECTIONS.ENCOUNTERS).doc();
      const encounter: Encounter = {
        id: docRef.id,
        ...insertEncounter,
        createdAt: new Date(),
      };
      
      await docRef.set(convertDatesToTimestamp(encounter));
      return encounter;
    } catch (error) {
      throw handleFirestoreError('createEncounter', error);
    }
  }

  async updateEncounter(id: string, updates: Partial<Encounter>): Promise<Encounter | undefined> {
    try {
      const docRef = db.collection(this.COLLECTIONS.ENCOUNTERS).doc(id);
      
      await docRef.update(convertDatesToTimestamp(updates));
      
      // Fetch and return the updated document
      const doc = await docRef.get();
      if (!doc.exists) return undefined;
      
      const data = doc.data();
      return convertTimestampsToDate({ id: doc.id, ...data }) as Encounter;
    } catch (error) {
      if (isFirestoreError(error) && error.code === 'not-found') return undefined;
      throw handleFirestoreError('updateEncounter', error);
    }
  }

  async getEncountersByPatient(patientId: string): Promise<Encounter[]> {
    try {
      const querySnapshot = await db.collection(this.COLLECTIONS.ENCOUNTERS)
        .where('patientId', '==', patientId)
        .orderBy('createdAt', 'desc')
        .get();
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return convertTimestampsToDate({ id: doc.id, ...data }) as Encounter;
      });
    } catch (error) {
      throw handleFirestoreError('getEncountersByPatient', error);
    }
  }

  // Prescriptions
  async getPrescription(id: string): Promise<Prescription | undefined> {
    try {
      const doc = await db.collection(this.COLLECTIONS.PRESCRIPTIONS).doc(id).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data();
      return convertTimestampsToDate({ id: doc.id, ...data }) as Prescription;
    } catch (error) {
      throw handleFirestoreError('getPrescription', error);
    }
  }

  async createPrescription(insertPrescription: InsertPrescription): Promise<Prescription> {
    try {
      const docRef = db.collection(this.COLLECTIONS.PRESCRIPTIONS).doc();
      const prescription: Prescription = {
        id: docRef.id,
        ...insertPrescription,
        emailSent: insertPrescription.emailSent ?? false,
        whatsappSent: insertPrescription.whatsappSent ?? false,
        createdAt: new Date(),
      };
      
      await docRef.set(convertDatesToTimestamp(prescription));
      return prescription;
    } catch (error) {
      throw handleFirestoreError('createPrescription', error);
    }
  }

  async updatePrescription(id: string, updates: Partial<Prescription>): Promise<Prescription | undefined> {
    try {
      const docRef = db.collection(this.COLLECTIONS.PRESCRIPTIONS).doc(id);
      
      await docRef.update(convertDatesToTimestamp(updates));
      
      // Fetch and return the updated document
      const doc = await docRef.get();
      if (!doc.exists) return undefined;
      
      const data = doc.data();
      return convertTimestampsToDate({ id: doc.id, ...data }) as Prescription;
    } catch (error) {
      if (isFirestoreError(error) && error.code === 'not-found') return undefined;
      throw handleFirestoreError('updatePrescription', error);
    }
  }

  async getPrescriptions(): Promise<Prescription[]> {
    try {
      const querySnapshot = await db.collection(this.COLLECTIONS.PRESCRIPTIONS)
        .orderBy('createdAt', 'desc')
        .get();
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return convertTimestampsToDate({ id: doc.id, ...data }) as Prescription;
      });
    } catch (error) {
      throw handleFirestoreError('getPrescriptions', error);
    }
  }

  async getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    try {
      const querySnapshot = await db.collection(this.COLLECTIONS.PRESCRIPTIONS)
        .where('patientId', '==', patientId)
        .orderBy('createdAt', 'desc')
        .get();
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return convertTimestampsToDate({ id: doc.id, ...data }) as Prescription;
      });
    } catch (error) {
      throw handleFirestoreError('getPrescriptionsByPatient', error);
    }
  }

  // Audit Logs
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    try {
      const docRef = db.collection(this.COLLECTIONS.AUDIT_LOGS).doc();
      const log: AuditLog = {
        id: docRef.id,
        ...insertLog,
        createdAt: new Date(),
      };
      
      await docRef.set(convertDatesToTimestamp(log));
      return log;
    } catch (error) {
      throw handleFirestoreError('createAuditLog', error);
    }
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const querySnapshot = await db.collection(this.COLLECTIONS.AUDIT_LOGS)
        .orderBy('createdAt', 'desc')
        .get();
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return convertTimestampsToDate({ id: doc.id, ...data }) as AuditLog;
      });
    } catch (error) {
      throw handleFirestoreError('getAuditLogs', error);
    }
  }
}

// In-memory storage implementation for development
export class MemoryStorage implements IStorage {
  private users = new Map<string, User>();
  private patients = new Map<string, Patient>();
  private appointments = new Map<string, Appointment>();
  private encounters = new Map<string, Encounter>();
  private prescriptions = new Map<string, Prescription>();
  private auditLogs = new Map<string, AuditLog>();
  private idCounter = 1;

  constructor() {
    // Only initialize sample data in development with explicit flag
    if (process.env.NODE_ENV === 'development' && process.env.SEED_DATA === 'true') {
      this.initializeSampleData();
    }
  }

  private generateId(): string {
    return `mem_${this.idCounter++}_${Date.now()}`;
  }

  private initializeSampleData() {
    console.log('📦 Initializing MemoryStorage sample data...');
    // Sample users
    const adminUser: User = {
      id: this.generateId(),
      firebaseUid: "admin-firebase-uid",
      email: "admin@smilecare.com",
      emailLower: "admin@smilecare.com",
      name: "Dr. Admin User",
      role: "admin",
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

    const doctor1: User = {
      id: this.generateId(),
      firebaseUid: "doctor1-firebase-uid",
      email: "dr.smith@smilecare.com",
      emailLower: "dr.smith@smilecare.com",
      name: "Dr. Smith",
      role: "doctor",
      specialization: "General Dentistry",
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(doctor1.id, doctor1);

    const doctor2: User = {
      id: this.generateId(),
      firebaseUid: "doctor2-firebase-uid",
      email: "dr.johnson@smilecare.com",
      emailLower: "dr.johnson@smilecare.com",
      name: "Dr. Johnson",
      role: "doctor",
      specialization: "Oral Surgery",
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(doctor2.id, doctor2);

    const staff: User = {
      id: this.generateId(),
      firebaseUid: "staff-firebase-uid",
      email: "staff@smilecare.com",
      emailLower: "staff@smilecare.com",
      name: "Staff Member",
      role: "staff",
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(staff.id, staff);

    // Sample patients
    const patient1: Patient = {
      id: this.generateId(),
      firstName: "John",
      lastName: "Doe",
      fullName: "John Doe",
      fullNameLower: "john doe",
      dateOfBirth: new Date("1985-06-15"),
      gender: "male",
      phone: "+1234567890",
      email: "john.doe@email.com",
      emailLower: "john.doe@email.com",
      address: "123 Main St",
      medicalHistory: "No significant medical history",
      allergies: "None",
      communicationPreferences: { email: true, whatsapp: true },
      createdAt: new Date(),
    };
    this.patients.set(patient1.id, patient1);

    const patient2: Patient = {
      id: this.generateId(),
      firstName: "Jane",
      lastName: "Smith",
      fullName: "Jane Smith",
      fullNameLower: "jane smith",
      dateOfBirth: new Date("1990-03-22"),
      gender: "female",
      phone: "+1234567891",
      email: "jane.smith@email.com",
      emailLower: "jane.smith@email.com",
      address: "456 Oak Ave",
      medicalHistory: "Diabetes Type 2",
      allergies: "Penicillin",
      communicationPreferences: { email: true, whatsapp: false },
      createdAt: new Date(),
    };
    this.patients.set(patient2.id, patient2);

    // Sample appointments
    const today = new Date();
    const appointment1: Appointment = {
      id: this.generateId(),
      patientId: patient1.id,
      doctorId: doctor1.id,
      scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
      scheduledDate: today.toISOString().split('T')[0],
      duration: 30,
      appointmentType: "routine",
      status: "scheduled",
      notes: "Regular checkup",
      patientName: patient1.fullName,
      doctorName: doctor1.name,
      createdAt: new Date(),
    };
    this.appointments.set(appointment1.id, appointment1);

    const appointment2: Appointment = {
      id: this.generateId(),
      patientId: patient2.id,
      doctorId: doctor2.id,
      scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
      scheduledDate: today.toISOString().split('T')[0],
      duration: 60,
      appointmentType: "routine",
      status: "completed",
      notes: "Cleaning and examination",
      patientName: patient2.fullName,
      doctorName: doctor2.name,
      createdAt: new Date(),
    };
    this.appointments.set(appointment2.id, appointment2);

    // Sample prescription
    const prescription: Prescription = {
      id: this.generateId(),
      encounterId: "encounter-1",
      patientId: patient1.id,
      doctorId: doctor1.id,
      medications: [
        {
          name: "Amoxicillin",
          dosage: "500mg",
          frequency: "3 times daily",
          duration: "7 days",
          instructions: "Take with food"
        }
      ],
      emailSent: true,
      whatsappSent: false,
      createdAt: new Date(),
    };
    this.prescriptions.set(prescription.id, prescription);

    console.log('📦 MemoryStorage sample data initialized successfully');
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.firebaseUid === firebaseUid) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.generateId(),
      ...insertUser,
      emailLower: insertUser.email.toLowerCase(),
      isActive: insertUser.isActive ?? true,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;

    const updatedUser = {
      ...existingUser,
      ...updates,
      emailLower: updates.email ? updates.email.toLowerCase() : existingUser.emailLower,
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Patients
  async getPatient(id: string): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const fullName = `${insertPatient.firstName} ${insertPatient.lastName}`;
    const patient: Patient = {
      id: this.generateId(),
      ...insertPatient,
      fullName,
      fullNameLower: fullName.toLowerCase(),
      emailLower: insertPatient.email?.toLowerCase(),
      createdAt: new Date(),
    };
    this.patients.set(patient.id, patient);
    return patient;
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | undefined> {
    const existingPatient = this.patients.get(id);
    if (!existingPatient) return undefined;

    let fullName = existingPatient.fullName;
    if (updates.firstName || updates.lastName) {
      const firstName = updates.firstName || existingPatient.firstName;
      const lastName = updates.lastName || existingPatient.lastName;
      fullName = `${firstName} ${lastName}`;
    }

    const updatedPatient = {
      ...existingPatient,
      ...updates,
      fullName,
      fullNameLower: fullName.toLowerCase(),
      emailLower: updates.email ? updates.email.toLowerCase() : existingPatient.emailLower,
    };
    this.patients.set(id, updatedPatient);
    return updatedPatient;
  }

  async getPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async searchPatients(query: string): Promise<Patient[]> {
    const lowercaseQuery = query.toLowerCase();
    const results: Patient[] = [];

    for (const patient of Array.from(this.patients.values())) {
      // Search by name
      if (patient.fullNameLower.includes(lowercaseQuery)) {
        results.push(patient);
        continue;
      }
      // Search by phone
      if (patient.phone && patient.phone.includes(query)) {
        results.push(patient);
        continue;
      }
      // Search by email
      if (patient.emailLower && patient.emailLower.includes(lowercaseQuery)) {
        results.push(patient);
        continue;
      }
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Appointments
  async getAppointment(id: string): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const scheduledDate = new Date(insertAppointment.scheduledAt).toISOString().split('T')[0];
    const appointment: Appointment = {
      id: this.generateId(),
      ...insertAppointment,
      scheduledDate,
      duration: insertAppointment.duration ?? 30,
      status: insertAppointment.status ?? "scheduled",
      createdAt: new Date(),
    };
    this.appointments.set(appointment.id, appointment);
    return appointment;
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | undefined> {
    const existingAppointment = this.appointments.get(id);
    if (!existingAppointment) return undefined;

    const updatedAppointment = {
      ...existingAppointment,
      ...updates,
      scheduledDate: updates.scheduledAt 
        ? new Date(updates.scheduledAt).toISOString().split('T')[0]
        : existingAppointment.scheduledDate,
    };
    this.appointments.set(id, updatedAppointment);
    return updatedAppointment;
  }

  async getAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    const results: Appointment[] = [];
    for (const appointment of Array.from(this.appointments.values())) {
      if (appointment.scheduledDate === date) {
        results.push(appointment);
      }
    }
    return results.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  async getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
    const results: Appointment[] = [];
    for (const appointment of Array.from(this.appointments.values())) {
      if (appointment.doctorId === doctorId) {
        results.push(appointment);
      }
    }
    return results.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  // Encounters
  async getEncounter(id: string): Promise<Encounter | undefined> {
    return this.encounters.get(id);
  }

  async createEncounter(insertEncounter: InsertEncounter): Promise<Encounter> {
    const encounter: Encounter = {
      id: this.generateId(),
      ...insertEncounter,
      createdAt: new Date(),
    };
    this.encounters.set(encounter.id, encounter);
    return encounter;
  }

  async updateEncounter(id: string, updates: Partial<Encounter>): Promise<Encounter | undefined> {
    const existingEncounter = this.encounters.get(id);
    if (!existingEncounter) return undefined;

    const updatedEncounter = { ...existingEncounter, ...updates };
    this.encounters.set(id, updatedEncounter);
    return updatedEncounter;
  }

  async getEncountersByPatient(patientId: string): Promise<Encounter[]> {
    const results: Encounter[] = [];
    for (const encounter of Array.from(this.encounters.values())) {
      if (encounter.patientId === patientId) {
        results.push(encounter);
      }
    }
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Prescriptions
  async getPrescription(id: string): Promise<Prescription | undefined> {
    return this.prescriptions.get(id);
  }

  async createPrescription(insertPrescription: InsertPrescription): Promise<Prescription> {
    const prescription: Prescription = {
      id: this.generateId(),
      ...insertPrescription,
      emailSent: insertPrescription.emailSent ?? false,
      whatsappSent: insertPrescription.whatsappSent ?? false,
      createdAt: new Date(),
    };
    this.prescriptions.set(prescription.id, prescription);
    return prescription;
  }

  async updatePrescription(id: string, updates: Partial<Prescription>): Promise<Prescription | undefined> {
    const existingPrescription = this.prescriptions.get(id);
    if (!existingPrescription) return undefined;

    const updatedPrescription = { ...existingPrescription, ...updates };
    this.prescriptions.set(id, updatedPrescription);
    return updatedPrescription;
  }

  async getPrescriptions(): Promise<Prescription[]> {
    return Array.from(this.prescriptions.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    const results: Prescription[] = [];
    for (const prescription of Array.from(this.prescriptions.values())) {
      if (prescription.patientId === patientId) {
        results.push(prescription);
      }
    }
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Audit Logs
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const log: AuditLog = {
      id: this.generateId(),
      ...insertLog,
      createdAt: new Date(),
    };
    this.auditLogs.set(log.id, log);
    return log;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

// Hybrid storage class that attempts Firestore but falls back to Memory storage
class HybridStorage implements IStorage {
  private firestoreStorage: FirestoreStorage;
  private memoryStorage: MemoryStorage | null = null;
  private useFirestore = true;
  private fallbackInitialized = false;
  private firestoreAvailabilityChecked = false;

  constructor() {
    this.firestoreStorage = new FirestoreStorage();
    // Check Firestore availability at startup
    this.checkFirestoreAvailability();
  }

  private async checkFirestoreAvailability() {
    if (this.firestoreAvailabilityChecked) return;
    
    try {
      // Test Firestore connection with a simple operation
      await db.collection('__test__').limit(1).get();
      console.log('✅ Firestore connection verified');
      this.useFirestore = true;
    } catch (error: any) {
      // Check if it's an authentication or connection error
      if (error.code === 2 || error.message?.includes('Getting metadata from plugin failed')) {
        console.log('🔄 Firestore authentication failed, falling back to MemoryStorage');
        this.useFirestore = false;
        await this.initializeFallback();
      } else {
        console.log('⚠️ Firestore connection test failed:', error.message);
        this.useFirestore = false;
        await this.initializeFallback();
      }
    } finally {
      this.firestoreAvailabilityChecked = true;
    }
  }

  private async initializeFallback() {
    if (!this.fallbackInitialized) {
      console.log('🔄 Initializing MemoryStorage as fallback...');
      this.memoryStorage = new MemoryStorage();
      this.fallbackInitialized = true;
      console.log('✅ MemoryStorage fallback initialized');
    }
  }

  private async executeWithFallback<T>(
    firestoreOperation: () => Promise<T>,
    memoryOperation: () => Promise<T>
  ): Promise<T> {
    // Ensure availability check is complete
    if (!this.firestoreAvailabilityChecked) {
      await this.checkFirestoreAvailability();
    }
    
    if (this.useFirestore) {
      try {
        return await firestoreOperation();
      } catch (error: any) {
        // If we get an error after initial check, disable Firestore
        console.log('🔄 Firestore operation failed, switching to MemoryStorage permanently');
        this.useFirestore = false;
        await this.initializeFallback();
        // Fall through to memory operation
      }
    }
    
    if (!this.memoryStorage) {
      await this.initializeFallback();
    }
    return memoryOperation();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.executeWithFallback(
      () => this.firestoreStorage.getUser(id),
      () => this.memoryStorage!.getUser(id)
    );
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return this.executeWithFallback(
      () => this.firestoreStorage.getUserByFirebaseUid(firebaseUid),
      () => this.memoryStorage!.getUserByFirebaseUid(firebaseUid)
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.executeWithFallback(
      () => this.firestoreStorage.createUser(user),
      () => this.memoryStorage!.createUser(user)
    );
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    return this.executeWithFallback(
      () => this.firestoreStorage.updateUser(id, updates),
      () => this.memoryStorage!.updateUser(id, updates)
    );
  }

  async getUsers(): Promise<User[]> {
    return this.executeWithFallback(
      () => this.firestoreStorage.getUsers(),
      () => this.memoryStorage!.getUsers()
    );
  }

  // Patients
  async getPatient(id: string): Promise<Patient | undefined> {
    return this.executeWithFallback(
      () => this.firestoreStorage.getPatient(id),
      () => this.memoryStorage!.getPatient(id)
    );
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    return this.executeWithFallback(
      () => this.firestoreStorage.createPatient(patient),
      () => this.memoryStorage!.createPatient(patient)
    );
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | undefined> {
    return this.executeWithFallback(
      () => this.firestoreStorage.updatePatient(id, updates),
      () => this.memoryStorage!.updatePatient(id, updates)
    );
  }

  async getPatients(): Promise<Patient[]> {
    return this.executeWithFallback(
      () => this.firestoreStorage.getPatients(),
      () => this.memoryStorage!.getPatients()
    );
  }

  async searchPatients(query: string): Promise<Patient[]> {
    return this.executeWithFallback(
      () => this.firestoreStorage.searchPatients(query),
      () => this.memoryStorage!.searchPatients(query)
    );
  }

  // Appointments
  async getAppointment(id: string): Promise<Appointment | undefined> {
    return this.executeWithFallback(
      () => this.firestoreStorage.getAppointment(id),
      () => this.memoryStorage!.getAppointment(id)
    );
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    return this.executeWithFallback(
      () => this.firestoreStorage.createAppointment(appointment),
      () => this.memoryStorage!.createAppointment(appointment)
    );
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | undefined> {
    return this.executeWithFallback(
      () => this.firestoreStorage.updateAppointment(id, updates),
      () => this.memoryStorage!.updateAppointment(id, updates)
    );
  }

  async getAppointments(): Promise<Appointment[]> {
    return this.executeWithFallback(
      () => this.firestoreStorage.getAppointments(),
      () => this.memoryStorage!.getAppointments()
    );
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    return this.executeWithFallback(
      () => this.firestoreStorage.getAppointmentsByDate(date),
      () => this.memoryStorage!.getAppointmentsByDate(date)
    );
  }

  async getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
    return this.executeWithFallback(
      () => this.firestoreStorage.getAppointmentsByDoctor(doctorId),
      () => this.memoryStorage!.getAppointmentsByDoctor(doctorId)
    );
  }

  // Encounters
  async getEncounter(id: string): Promise<Encounter | undefined> {
    return this.executeWithFallback(
      () => this.firestoreStorage.getEncounter(id),
      () => this.memoryStorage!.getEncounter(id)
    );
  }

  async createEncounter(encounter: InsertEncounter): Promise<Encounter> {
    return this.executeWithFallback(
      () => this.firestoreStorage.createEncounter(encounter),
      () => this.memoryStorage!.createEncounter(encounter)
    );
  }

  async updateEncounter(id: string, updates: Partial<Encounter>): Promise<Encounter | undefined> {
    return this.executeWithFallback(
      () => this.firestoreStorage.updateEncounter(id, updates),
      () => this.memoryStorage!.updateEncounter(id, updates)
    );
  }

  async getEncountersByPatient(patientId: string): Promise<Encounter[]> {
    return this.executeWithFallback(
      () => this.firestoreStorage.getEncountersByPatient(patientId),
      () => this.memoryStorage!.getEncountersByPatient(patientId)
    );
  }

  // Prescriptions
  async getPrescription(id: string): Promise<Prescription | undefined> {
    return this.executeWithFallback(
      () => this.firestoreStorage.getPrescription(id),
      () => this.memoryStorage!.getPrescription(id)
    );
  }

  async createPrescription(prescription: InsertPrescription): Promise<Prescription> {
    return this.executeWithFallback(
      () => this.firestoreStorage.createPrescription(prescription),
      () => this.memoryStorage!.createPrescription(prescription)
    );
  }

  async updatePrescription(id: string, updates: Partial<Prescription>): Promise<Prescription | undefined> {
    return this.executeWithFallback(
      () => this.firestoreStorage.updatePrescription(id, updates),
      () => this.memoryStorage!.updatePrescription(id, updates)
    );
  }

  async getPrescriptions(): Promise<Prescription[]> {
    return this.executeWithFallback(
      () => this.firestoreStorage.getPrescriptions(),
      () => this.memoryStorage!.getPrescriptions()
    );
  }

  async getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    return this.executeWithFallback(
      () => this.firestoreStorage.getPrescriptionsByPatient(patientId),
      () => this.memoryStorage!.getPrescriptionsByPatient(patientId)
    );
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    return this.executeWithFallback(
      () => this.firestoreStorage.createAuditLog(log),
      () => this.memoryStorage!.createAuditLog(log)
    );
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return this.executeWithFallback(
      () => this.firestoreStorage.getAuditLogs(),
      () => this.memoryStorage!.getAuditLogs()
    );
  }
}

export const storage = new HybridStorage();

// Export the individual storage classes for direct use if needed
// MemoryStorage is already exported above