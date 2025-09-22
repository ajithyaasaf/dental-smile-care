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

export class FirestoreStorage implements IStorage {
  private usersCollection = db.collection('users');
  private patientsCollection = db.collection('patients');
  private appointmentsCollection = db.collection('appointments');
  private encountersCollection = db.collection('encounters');
  private prescriptionsCollection = db.collection('prescriptions');
  private auditLogsCollection = db.collection('audit_logs');

  constructor() {
    // Firestore collections are automatically created when first document is added
  }

  private convertTimestamp(timestamp: any): Date {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate();
    }
    return timestamp instanceof Date ? timestamp : new Date(timestamp);
  }

  private convertToFirestoreData(data: any): any {
    const converted = { ...data };
    if (converted.createdAt instanceof Date) {
      converted.createdAt = Timestamp.fromDate(converted.createdAt);
    }
    if (converted.scheduledAt instanceof Date) {
      converted.scheduledAt = Timestamp.fromDate(converted.scheduledAt);
    }
    if (converted.dateOfBirth instanceof Date) {
      converted.dateOfBirth = Timestamp.fromDate(converted.dateOfBirth);
    }
    return converted;
  }

  private convertFromFirestoreData(data: any): any {
    if (!data) return null;
    const converted = { ...data };
    if (converted.createdAt) {
      converted.createdAt = this.convertTimestamp(converted.createdAt);
    }
    if (converted.scheduledAt) {
      converted.scheduledAt = this.convertTimestamp(converted.scheduledAt);
    }
    if (converted.dateOfBirth) {
      converted.dateOfBirth = this.convertTimestamp(converted.dateOfBirth);
    }
    return converted;
  }

  async initializeSampleData() {
    // Check if admin user already exists
    const existingAdmin = await this.usersCollection.where('email', '==', 'admin@smilecare.com').get();
    
    if (existingAdmin.empty) {
      // Sample admin user
      const adminData = {
        firebaseUid: "admin-firebase-uid",
        email: "admin@smilecare.com",
        emailLower: "admin@smilecare.com",
        name: "Dr. Admin User",
        role: "admin" as const,
        isActive: true,
        createdAt: Timestamp.now(),
      };
      const adminRef = await this.usersCollection.add(adminData);
      
      // Sample doctors
      const doctor1Data = {
        firebaseUid: "doctor1-firebase-uid",
        email: "dr.smith@smilecare.com",
        emailLower: "dr.smith@smilecare.com",
        name: "Dr. Smith",
        role: "doctor" as const,
        specialization: "General Dentistry",
        isActive: true,
        createdAt: Timestamp.now(),
      };
      await this.usersCollection.add(doctor1Data);

      const doctor2Data = {
        firebaseUid: "doctor2-firebase-uid",
        email: "dr.johnson@smilecare.com",
        emailLower: "dr.johnson@smilecare.com",
        name: "Dr. Johnson",
        role: "doctor" as const,
        specialization: "Oral Surgery",
        isActive: true,
        createdAt: Timestamp.now(),
      };
      await this.usersCollection.add(doctor2Data);
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const doc = await this.usersCollection.doc(id).get();
    if (!doc.exists) return undefined;
    const data = this.convertFromFirestoreData(doc.data());
    return { id: doc.id, ...data } as User;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const snapshot = await this.usersCollection.where('firebaseUid', '==', firebaseUid).get();
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    const data = this.convertFromFirestoreData(doc.data());
    return { id: doc.id, ...data } as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const userData = {
      ...insertUser,
      emailLower: insertUser.email.toLowerCase(),
      isActive: insertUser.isActive ?? true,
      createdAt: Timestamp.now(),
    };
    
    const firestoreData = this.convertToFirestoreData(userData);
    const docRef = await this.usersCollection.add(firestoreData);
    
    return {
      id: docRef.id,
      ...this.convertFromFirestoreData(userData)
    } as User;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const docRef = this.usersCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    
    const updateData = this.convertToFirestoreData(updates);
    if (updates.email) {
      updateData.emailLower = updates.email.toLowerCase();
    }
    
    await docRef.update(updateData);
    
    const updatedDoc = await docRef.get();
    const data = this.convertFromFirestoreData(updatedDoc.data());
    return { id: updatedDoc.id, ...data } as User;
  }

  async getUsers(): Promise<User[]> {
    const snapshot = await this.usersCollection.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => {
      const data = this.convertFromFirestoreData(doc.data());
      return { id: doc.id, ...data } as User;
    });
  }

  // Patients
  async getPatient(id: string): Promise<Patient | undefined> {
    const doc = await this.patientsCollection.doc(id).get();
    if (!doc.exists) return undefined;
    const data = this.convertFromFirestoreData(doc.data());
    return { id: doc.id, ...data } as Patient;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const fullName = `${insertPatient.firstName} ${insertPatient.lastName}`;
    const patientData = {
      ...insertPatient,
      fullName,
      fullNameLower: fullName.toLowerCase(),
      emailLower: insertPatient.email?.toLowerCase(),
      createdAt: Timestamp.now(),
    };
    
    const firestoreData = this.convertToFirestoreData(patientData);
    const docRef = await this.patientsCollection.add(firestoreData);
    
    return {
      id: docRef.id,
      ...this.convertFromFirestoreData(patientData)
    } as Patient;
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | undefined> {
    const docRef = this.patientsCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    
    const updateData = this.convertToFirestoreData(updates);
    
    // Update computed fields if name or email changed
    if (updates.firstName || updates.lastName) {
      const currentData = doc.data();
      const firstName = updates.firstName || currentData?.firstName;
      const lastName = updates.lastName || currentData?.lastName;
      const fullName = `${firstName} ${lastName}`;
      updateData.fullName = fullName;
      updateData.fullNameLower = fullName.toLowerCase();
    }
    
    if (updates.email) {
      updateData.emailLower = updates.email.toLowerCase();
    }
    
    await docRef.update(updateData);
    
    const updatedDoc = await docRef.get();
    const data = this.convertFromFirestoreData(updatedDoc.data());
    return { id: updatedDoc.id, ...data } as Patient;
  }

  async getPatients(): Promise<Patient[]> {
    const snapshot = await this.patientsCollection.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => {
      const data = this.convertFromFirestoreData(doc.data());
      return { id: doc.id, ...data } as Patient;
    });
  }

  async searchPatients(query: string): Promise<Patient[]> {
    const lowercaseQuery = query.toLowerCase();
    
    // Firestore prefix search for names
    const nameSnapshot = await this.patientsCollection
      .where('fullNameLower', '>=', lowercaseQuery)
      .where('fullNameLower', '<=', lowercaseQuery + '\uf8ff')
      .get();
    
    // Phone search (exact match)
    const phoneSnapshot = await this.patientsCollection
      .where('phone', '==', query)
      .get();
    
    // Combine results and deduplicate
    const results = new Map<string, Patient>();
    
    [...nameSnapshot.docs, ...phoneSnapshot.docs].forEach(doc => {
      const data = this.convertFromFirestoreData(doc.data());
      results.set(doc.id, { id: doc.id, ...data } as Patient);
    });
    
    return Array.from(results.values());
  }

  // Appointments
  async getAppointment(id: string): Promise<Appointment | undefined> {
    const doc = await this.appointmentsCollection.doc(id).get();
    if (!doc.exists) return undefined;
    const data = this.convertFromFirestoreData(doc.data());
    return { id: doc.id, ...data } as Appointment;
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const scheduledDate = new Date(insertAppointment.scheduledAt).toISOString().split('T')[0];
    
    const appointmentData = {
      ...insertAppointment,
      scheduledDate,
      duration: insertAppointment.duration ?? 30,
      status: insertAppointment.status ?? "scheduled",
      createdAt: Timestamp.now(),
    };
    
    const firestoreData = this.convertToFirestoreData(appointmentData);
    const docRef = await this.appointmentsCollection.add(firestoreData);
    
    return {
      id: docRef.id,
      ...this.convertFromFirestoreData(appointmentData)
    } as Appointment;
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | undefined> {
    const docRef = this.appointmentsCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    
    const updateData = this.convertToFirestoreData(updates);
    
    if (updates.scheduledAt) {
      updateData.scheduledDate = new Date(updates.scheduledAt).toISOString().split('T')[0];
    }
    
    await docRef.update(updateData);
    
    const updatedDoc = await docRef.get();
    const data = this.convertFromFirestoreData(updatedDoc.data());
    return { id: updatedDoc.id, ...data } as Appointment;
  }

  async getAppointments(): Promise<Appointment[]> {
    const snapshot = await this.appointmentsCollection.orderBy('scheduledAt', 'desc').get();
    return snapshot.docs.map(doc => {
      const data = this.convertFromFirestoreData(doc.data());
      return { id: doc.id, ...data } as Appointment;
    });
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    const snapshot = await this.appointmentsCollection
      .where('scheduledDate', '==', date)
      .orderBy('scheduledAt', 'asc')
      .get();
    
    return snapshot.docs.map(doc => {
      const data = this.convertFromFirestoreData(doc.data());
      return { id: doc.id, ...data } as Appointment;
    });
  }

  async getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
    const snapshot = await this.appointmentsCollection
      .where('doctorId', '==', doctorId)
      .orderBy('scheduledAt', 'asc')
      .get();
    
    return snapshot.docs.map(doc => {
      const data = this.convertFromFirestoreData(doc.data());
      return { id: doc.id, ...data } as Appointment;
    });
  }

  // Encounters
  async getEncounter(id: string): Promise<Encounter | undefined> {
    const doc = await this.encountersCollection.doc(id).get();
    if (!doc.exists) return undefined;
    const data = this.convertFromFirestoreData(doc.data());
    return { id: doc.id, ...data } as Encounter;
  }

  async createEncounter(insertEncounter: InsertEncounter): Promise<Encounter> {
    const encounterData = {
      ...insertEncounter,
      createdAt: Timestamp.now(),
    };
    
    const firestoreData = this.convertToFirestoreData(encounterData);
    const docRef = await this.encountersCollection.add(firestoreData);
    
    return {
      id: docRef.id,
      ...this.convertFromFirestoreData(encounterData)
    } as Encounter;
  }

  async updateEncounter(id: string, updates: Partial<Encounter>): Promise<Encounter | undefined> {
    const docRef = this.encountersCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    
    const updateData = this.convertToFirestoreData(updates);
    await docRef.update(updateData);
    
    const updatedDoc = await docRef.get();
    const data = this.convertFromFirestoreData(updatedDoc.data());
    return { id: updatedDoc.id, ...data } as Encounter;
  }

  async getEncountersByPatient(patientId: string): Promise<Encounter[]> {
    const snapshot = await this.encountersCollection
      .where('patientId', '==', patientId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => {
      const data = this.convertFromFirestoreData(doc.data());
      return { id: doc.id, ...data } as Encounter;
    });
  }

  // Prescriptions
  async getPrescription(id: string): Promise<Prescription | undefined> {
    const doc = await this.prescriptionsCollection.doc(id).get();
    if (!doc.exists) return undefined;
    const data = this.convertFromFirestoreData(doc.data());
    return { id: doc.id, ...data } as Prescription;
  }

  async createPrescription(insertPrescription: InsertPrescription): Promise<Prescription> {
    const prescriptionData = {
      ...insertPrescription,
      emailSent: insertPrescription.emailSent ?? false,
      whatsappSent: insertPrescription.whatsappSent ?? false,
      createdAt: Timestamp.now(),
    };
    
    const firestoreData = this.convertToFirestoreData(prescriptionData);
    const docRef = await this.prescriptionsCollection.add(firestoreData);
    
    return {
      id: docRef.id,
      ...this.convertFromFirestoreData(prescriptionData)
    } as Prescription;
  }

  async updatePrescription(id: string, updates: Partial<Prescription>): Promise<Prescription | undefined> {
    const docRef = this.prescriptionsCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    
    const updateData = this.convertToFirestoreData(updates);
    await docRef.update(updateData);
    
    const updatedDoc = await docRef.get();
    const data = this.convertFromFirestoreData(updatedDoc.data());
    return { id: updatedDoc.id, ...data } as Prescription;
  }

  async getPrescriptions(): Promise<Prescription[]> {
    const snapshot = await this.prescriptionsCollection.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => {
      const data = this.convertFromFirestoreData(doc.data());
      return { id: doc.id, ...data } as Prescription;
    });
  }

  async getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    const snapshot = await this.prescriptionsCollection
      .where('patientId', '==', patientId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => {
      const data = this.convertFromFirestoreData(doc.data());
      return { id: doc.id, ...data } as Prescription;
    });
  }

  // Audit Logs
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const logData = {
      ...insertLog,
      createdAt: Timestamp.now(),
    };
    
    const firestoreData = this.convertToFirestoreData(logData);
    const docRef = await this.auditLogsCollection.add(firestoreData);
    
    return {
      id: docRef.id,
      ...this.convertFromFirestoreData(logData)
    } as AuditLog;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    const snapshot = await this.auditLogsCollection.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => {
      const data = this.convertFromFirestoreData(doc.data());
      return { id: doc.id, ...data } as AuditLog;
    });
  }
}

export const storage = new FirestoreStorage();

// Initialize sample data on startup
storage.initializeSampleData().catch(console.error);
