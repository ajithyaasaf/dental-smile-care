import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MultiStepForm } from "@/components/ui/multi-step-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertPatientSchema } from "@shared/schema";
import { z } from "zod";
import { Upload } from "lucide-react";

const patientFormSchema = insertPatientSchema.extend({
  communicationPreferences: z.object({
    email: z.boolean().default(true),
    whatsapp: z.boolean().default(false),
  }).optional(),
  emergencyContact: z.object({
    name: z.string(),
    phone: z.string(),
    relationship: z.string(),
  }).optional(),
});

type PatientFormData = z.infer<typeof patientFormSchema>;

interface PatientRegistrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  { title: "Personal Details", description: "Basic information" },
  { title: "Contact Info", description: "Contact and emergency details" },
  { title: "Medical History", description: "Health information" },
];

export function PatientRegistration({ open, onOpenChange }: PatientRegistrationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: new Date(),
      gender: "",
      phone: "",
      email: "",
      address: "",
      medicalHistory: "",
      allergies: "",
      communicationPreferences: {
        email: true,
        whatsapp: false,
      },
      emergencyContact: {
        name: "",
        phone: "",
        relationship: "",
      },
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: (data: PatientFormData) =>
      apiRequest('POST', '/api/patients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      toast({
        title: "Success",
        description: "Patient registered successfully",
      });
      onOpenChange(false);
      form.reset();
      setCurrentStep(0);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to register patient",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PatientFormData) => {
    createPatientMutation.mutate(data);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      form.handleSubmit(onSubmit)();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register New Patient</DialogTitle>
        </DialogHeader>

        <MultiStepForm steps={steps} currentStep={currentStep}>
          <form className="space-y-6">
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      {...form.register("firstName")}
                      placeholder="Enter first name"
                      data-testid="input-first-name"
                    />
                    {form.formState.errors.firstName && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      {...form.register("lastName")}
                      placeholder="Enter last name"
                      data-testid="input-last-name"
                    />
                    {form.formState.errors.lastName && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...form.register("dateOfBirth", { 
                        valueAsDate: true 
                      })}
                      data-testid="input-date-of-birth"
                    />
                    {form.formState.errors.dateOfBirth && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.dateOfBirth.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select onValueChange={(value) => form.setValue("gender", value)}>
                      <SelectTrigger data-testid="select-gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Profile Photo Upload */}
                <div className="space-y-2">
                  <Label>Profile Photo</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Drop photo here or{" "}
                      <Button 
                        type="button" 
                        variant="link" 
                        className="p-0 h-auto font-medium text-primary"
                        data-testid="button-browse-photo"
                      >
                        browse
                      </Button>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      {...form.register("phone")}
                      placeholder="Enter phone number"
                      data-testid="input-phone"
                    />
                    {form.formState.errors.phone && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.phone.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register("email")}
                      placeholder="Enter email address"
                      data-testid="input-email"
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    {...form.register("address")}
                    placeholder="Enter full address"
                    data-testid="textarea-address"
                  />
                </div>

                {/* Emergency Contact */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyName">Contact Name</Label>
                      <Input
                        id="emergencyName"
                        {...form.register("emergencyContact.name")}
                        placeholder="Emergency contact name"
                        data-testid="input-emergency-name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="emergencyPhone">Contact Phone</Label>
                      <Input
                        id="emergencyPhone"
                        {...form.register("emergencyContact.phone")}
                        placeholder="Emergency contact phone"
                        data-testid="input-emergency-phone"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="emergencyRelationship">Relationship</Label>
                      <Input
                        id="emergencyRelationship"
                        {...form.register("emergencyContact.relationship")}
                        placeholder="Relationship to patient"
                        data-testid="input-emergency-relationship"
                      />
                    </div>
                  </div>
                </div>

                {/* Communication Preferences */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Communication Preferences</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="emailConsent"
                        {...form.register("communicationPreferences.email")}
                        data-testid="switch-email-consent"
                      />
                      <Label htmlFor="emailConsent">Email notifications</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="whatsappConsent"
                        {...form.register("communicationPreferences.whatsapp")}
                        data-testid="switch-whatsapp-consent"
                      />
                      <Label htmlFor="whatsappConsent">WhatsApp notifications</Label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="medicalHistory">Medical History</Label>
                  <Textarea
                    id="medicalHistory"
                    {...form.register("medicalHistory")}
                    placeholder="Previous medical conditions, surgeries, medications..."
                    rows={4}
                    data-testid="textarea-medical-history"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea
                    id="allergies"
                    {...form.register("allergies")}
                    placeholder="Known allergies to medications, foods, materials..."
                    rows={3}
                    data-testid="textarea-allergies"
                  />
                </div>
              </div>
            )}
          </form>
        </MultiStepForm>

        {/* Form Actions */}
        <div className="flex justify-between pt-6 border-t border-border">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={currentStep === 0}
            data-testid="button-previous"
          >
            Previous
          </Button>
          
          <Button 
            onClick={nextStep}
            disabled={createPatientMutation.isPending}
            data-testid="button-next"
          >
            {createPatientMutation.isPending ? (
              "Creating..."
            ) : currentStep === steps.length - 1 ? (
              "Create Patient"
            ) : (
              "Next Step"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
