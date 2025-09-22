import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertAppointmentSchema } from "@shared/schema";
import { z } from "zod";
import type { Patient, User } from "@shared/schema";

const appointmentFormSchema = insertAppointmentSchema.extend({
  scheduledAt: z.string(),
});

type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

interface AppointmentSchedulerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedPatientId?: string;
}

export function AppointmentScheduler({ 
  open, 
  onOpenChange, 
  preselectedPatientId 
}: AppointmentSchedulerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
    enabled: open,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: open,
  });

  const doctors = users.filter(user => user.role === 'doctor');

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientId: preselectedPatientId || "",
      doctorId: "",
      scheduledAt: "",
      duration: 30,
      appointmentType: "routine",
      notes: "",
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (data: AppointmentFormData) => {
      // Convert scheduledAt string to Date object
      const appointmentData = {
        ...data,
        scheduledAt: new Date(data.scheduledAt),
      };
      return apiRequest('POST', '/api/appointments', appointmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: "Success",
        description: "Appointment scheduled successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule appointment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AppointmentFormData) => {
    createAppointmentMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patientId">Patient *</Label>
            <Select
              onValueChange={(value) => form.setValue("patientId", value)}
              defaultValue={preselectedPatientId}
            >
              <SelectTrigger data-testid="select-patient">
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.patientId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.patientId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctorId">Doctor *</Label>
            <Select onValueChange={(value) => form.setValue("doctorId", value)}>
              <SelectTrigger data-testid="select-doctor">
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.specialization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.doctorId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.doctorId.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Date & Time *</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                {...form.register("scheduledAt")}
                data-testid="input-scheduled-at"
              />
              {form.formState.errors.scheduledAt && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.scheduledAt.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                step="15"
                {...form.register("duration", { valueAsNumber: true })}
                data-testid="input-duration"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointmentType">Appointment Type</Label>
            <Select onValueChange={(value) => form.setValue("appointmentType", value)}>
              <SelectTrigger data-testid="select-appointment-type">
                <SelectValue placeholder="Select appointment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="routine">Routine Check-up</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="filling">Filling</SelectItem>
                <SelectItem value="root_canal">Root Canal</SelectItem>
                <SelectItem value="extraction">Extraction</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="followup">Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Additional notes or special requirements..."
              rows={3}
              data-testid="textarea-notes"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createAppointmentMutation.isPending}
              data-testid="button-schedule"
            >
              {createAppointmentMutation.isPending ? "Scheduling..." : "Schedule Appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
