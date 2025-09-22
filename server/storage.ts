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

export class MemoryStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private patients: Map<string, Patient> = new Map();
  private appointments: Map<string, Appointment> = new Map();
  private encounters: Map<string, Encounter> = new Map();
  private prescriptions: Map<string, Prescription> = new Map();
  private auditLogs: Map<string, AuditLog> = new Map();
  private counter = 1;

  constructor() {
    this.initializeSampleData();
  }

  private generateId(): string {
    return `id-${this.counter++}`;
  }

  private initializeSampleData() {
    // Sample users
    const admin: User = {
      id: this.generateId(),
      firebaseUid: "admin-firebase-uid",
      email: "admin@smilecare.com",
      emailLower: "admin@smilecare.com",
      name: "Dr. Admin User",
      role: "admin",
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(admin.id, admin);

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
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
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
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = {
      ...user,
      ...updates,
      emailLower: updates.email ? updates.email.toLowerCase() : user.emailLower,
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
    const patient = this.patients.get(id);
    if (!patient) return undefined;

    let fullName = patient.fullName;
    if (updates.firstName || updates.lastName) {
      const firstName = updates.firstName || patient.firstName;
      const lastName = updates.lastName || patient.lastName;
      fullName = `${firstName} ${lastName}`;
    }

    const updatedPatient = {
      ...patient,
      ...updates,
      fullName,
      fullNameLower: fullName.toLowerCase(),
      emailLower: updates.email ? updates.email.toLowerCase() : patient.emailLower,
    };
    this.patients.set(id, updatedPatient);
    return updatedPatient;
  }

  async getPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async searchPatients(query: string): Promise<Patient[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.patients.values()).filter(patient =>
      patient.fullNameLower.includes(lowercaseQuery) ||
      patient.phone.includes(query) ||
      (patient.emailLower && patient.emailLower.includes(lowercaseQuery))
    );
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
    const appointment = this.appointments.get(id);
    if (!appointment) return undefined;

    const updatedAppointment = {
      ...appointment,
      ...updates,
      scheduledDate: updates.scheduledAt 
        ? new Date(updates.scheduledAt).toISOString().split('T')[0]
        : appointment.scheduledDate,
    };
    this.appointments.set(id, updatedAppointment);
    return updatedAppointment;
  }

  async getAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values())
      .filter(appointment => appointment.scheduledDate === date)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  async getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values())
      .filter(appointment => appointment.doctorId === doctorId)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
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
    const encounter = this.encounters.get(id);
    if (!encounter) return undefined;

    const updatedEncounter = { ...encounter, ...updates };
    this.encounters.set(id, updatedEncounter);
    return updatedEncounter;
  }

  async getEncountersByPatient(patientId: string): Promise<Encounter[]> {
    return Array.from(this.encounters.values())
      .filter(encounter => encounter.patientId === patientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
    const prescription = this.prescriptions.get(id);
    if (!prescription) return undefined;

    const updatedPrescription = { ...prescription, ...updates };
    this.prescriptions.set(id, updatedPrescription);
    return updatedPrescription;
  }

  async getPrescriptions(): Promise<Prescription[]> {
    return Array.from(this.prescriptions.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    return Array.from(this.prescriptions.values())
      .filter(prescription => prescription.patientId === patientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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

export const storage = new MemoryStorage();