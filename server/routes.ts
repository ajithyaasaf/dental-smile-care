import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertPatientSchema, 
  insertAppointmentSchema,
  insertEncounterSchema,
  insertPrescriptionSchema
} from "@shared/schema";
import { z } from "zod";

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: string;
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware placeholder (in real implementation, verify Firebase token)
  const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // TODO: Verify Firebase JWT token
    req.user = { id: 'user-id', role: 'admin' }; // Mock user for now
    next();
  };

  // Users routes
  app.get("/api/users", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      await storage.createAuditLog({
        userId: req.user.id,
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
  app.get("/api/patients", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { search } = req.query;
      const patients = search 
        ? await storage.searchPatients(search as string)
        : await storage.getPatients();
      res.json(patients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });

  app.get("/api/patients/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch patient" });
    }
  });

  app.post("/api/patients", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const patientData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(patientData);
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'create',
        entityType: 'patient',
        entityId: patient.id,
        changes: patientData
      });
      res.status(201).json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create patient" });
      }
    }
  });

  app.patch("/api/patients/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = req.body;
      const patient = await storage.updatePatient(req.params.id, updates);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      await storage.createAuditLog({
        userId: req.user.id,
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
  app.get("/api/appointments", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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

  app.post("/api/appointments", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const appointmentData = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(appointmentData);
      await storage.createAuditLog({
        userId: req.user.id,
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

  app.patch("/api/appointments/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = req.body;
      const appointment = await storage.updateAppointment(req.params.id, updates);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      await storage.createAuditLog({
        userId: req.user.id,
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
  app.get("/api/encounters/:patientId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const encounters = await storage.getEncountersByPatient(req.params.patientId);
      res.json(encounters);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch encounters" });
    }
  });

  app.post("/api/encounters", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const encounterData = insertEncounterSchema.parse(req.body);
      const encounter = await storage.createEncounter(encounterData);
      await storage.createAuditLog({
        userId: req.user.id,
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
  app.get("/api/prescriptions", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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

  app.post("/api/prescriptions", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const prescriptionData = insertPrescriptionSchema.parse(req.body);
      const prescription = await storage.createPrescription(prescriptionData);
      await storage.createAuditLog({
        userId: req.user.id,
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

  app.patch("/api/prescriptions/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = req.body;
      const prescription = await storage.updatePrescription(req.params.id, updates);
      if (!prescription) {
        return res.status(404).json({ error: "Prescription not found" });
      }
      await storage.createAuditLog({
        userId: req.user.id,
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
  app.get("/api/dashboard/stats", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
  app.post("/api/prescriptions/:id/whatsapp", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
