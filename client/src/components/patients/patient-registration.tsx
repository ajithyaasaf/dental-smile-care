import { useState, useCallback, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiStepForm } from "@/components/ui/multi-step-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertPatientSchema, type Patient } from "@shared/schema";
import { uploadPatientPhoto, validatePhoto, createPhotoPreviewUrl, revokePhotoPreviewUrl, formatFileSize, PhotoUploadError } from "@/lib/photoUpload";
import { z } from "zod";
import { Upload, Search, User, CheckCircle, X, Camera, AlertTriangle, ArrowLeft, ArrowRight, FileText, Eye, Edit } from "lucide-react";

// Custom hook for debounced search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

const patientFormSchema = insertPatientSchema.extend({
  communicationPreferences: z.object({
    email: z.boolean().default(true),
    whatsapp: z.boolean().default(false),
  }).optional(),
  emergencyContact: z.object({
    name: z.string().min(1, "Emergency contact name is required"),
    phone: z.string().min(1, "Emergency contact phone is required"),
    relationship: z.string().min(1, "Relationship is required"),
  }),
  consentForms: z.object({
    treatmentConsent: z.boolean().refine((val) => val === true, {
      message: "Treatment consent is required",
    }),
    privacyPolicyConsent: z.boolean().refine((val) => val === true, {
      message: "Privacy policy consent is required",
    }),
    dataProcessingConsent: z.boolean().refine((val) => val === true, {
      message: "Data processing consent is required",
    }),
    marketingConsent: z.boolean().default(false),
    consentDate: z.date().optional(),
  }),
});

type PatientFormData = z.infer<typeof patientFormSchema>;

interface PatientRegistrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  { title: "Personal Details", description: "Basic information & photo" },
  { title: "Contact Info", description: "Contact & emergency details" },
  { title: "Medical History", description: "Health information & allergies" },
  { title: "Consent Forms", description: "Required agreements" },
  { title: "Review & Confirm", description: "Final review" },
];

export function PatientRegistration({ open, onOpenChange }: PatientRegistrationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: new Date(),
      gender: undefined,
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
      consentForms: {
        treatmentConsent: false,
        privacyPolicyConsent: false,
        dataProcessingConsent: false,
        marketingConsent: false,
        consentDate: new Date(),
      },
    },
  });

  // Watch form values for review step
  const formValues = useWatch({ control: form.control });

  // Patient search query
  const { data: searchResults, isLoading: isSearching } = useQuery<Patient[]>({
    queryKey: ['/api/patients', { search: debouncedSearchQuery }],
    enabled: !!debouncedSearchQuery && debouncedSearchQuery.length >= 2 && showSearch,
    staleTime: 30000,
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data: PatientFormData) => {
      let finalData = { ...data };
      
      // Upload photo if provided
      if (photoFile && !uploadedPhotoUrl) {
        setIsUploading(true);
        try {
          const tempId = `temp-${Date.now()}`;
          const uploadResult = await uploadPatientPhoto(photoFile, tempId);
          finalData.profilePhotoUrl = uploadResult.url;
          setUploadedPhotoUrl(uploadResult.url);
        } catch (error) {
          setIsUploading(false);
          throw new Error("Failed to upload photo. Please try again.");
        }
        setIsUploading(false);
      } else if (uploadedPhotoUrl) {
        finalData.profilePhotoUrl = uploadedPhotoUrl;
      }

      return apiRequest('POST', '/api/patients', finalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      toast({
        title: "Success",
        description: "Patient registered successfully",
      });
      handleReset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to register patient",
        variant: "destructive",
      });
    },
  });

  const handleReset = () => {
    form.reset();
    setCurrentStep(0);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoError(null);
    setSearchQuery("");
    setShowSearch(true);
    setUploadedPhotoUrl(null);
    if (photoPreview) {
      revokePhotoPreviewUrl(photoPreview);
    }
  };

  const handlePhotoUpload = useCallback(async (file: File) => {
    try {
      setPhotoError(null);
      await validatePhoto(file);
      
      // Cleanup previous preview
      if (photoPreview) {
        revokePhotoPreviewUrl(photoPreview);
      }
      
      setPhotoFile(file);
      setPhotoPreview(createPhotoPreviewUrl(file));
    } catch (error) {
      if (error instanceof PhotoUploadError) {
        setPhotoError(error.message);
      } else {
        setPhotoError("Failed to process photo. Please try again.");
      }
    }
  }, [photoPreview]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handlePhotoUpload(file);
    }
  };

  const removePhoto = () => {
    if (photoPreview) {
      revokePhotoPreviewUrl(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoError(null);
    setUploadedPhotoUrl(null);
  };

  const validateStep = async (step: number): Promise<boolean> => {
    const stepFields: Record<number, string[]> = {
      0: ["firstName", "lastName", "dateOfBirth"],
      1: ["phone", "emergencyContact.name", "emergencyContact.phone", "emergencyContact.relationship"],
      2: [], // Medical history is optional
      3: ["consentForms.treatmentConsent", "consentForms.privacyPolicyConsent", "consentForms.dataProcessingConsent"],
      4: [], // Review step
    };

    const fieldsToValidate = stepFields[step] || [];
    const trigger = await form.trigger(fieldsToValidate as any);
    return trigger;
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final submission - get current form values to ensure proper typing
      const currentValues = form.getValues();
      const finalData: PatientFormData = {
        ...currentValues,
        consentForms: {
          ...currentValues.consentForms,
          consentDate: new Date(),
        },
      };
      createPatientMutation.mutate(finalData);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const selectExistingPatient = (patient: Patient) => {
    toast({
      title: "Patient Found",
      description: `${patient.firstName} ${patient.lastName} is already registered.`,
      variant: "destructive",
    });
  };

  const isLastStep = currentStep === steps.length - 1;
  const isLoading = createPatientMutation.isPending || isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title">Register New Patient</DialogTitle>
        </DialogHeader>

        {/* Patient Search */}
        {showSearch && currentStep === 0 && (
          <div className="space-y-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="patientSearch">Search for existing patients</Label>
            </div>
            <Input
              id="patientSearch"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, or email..."
              data-testid="input-patient-search"
            />
            
            {isSearching && (
              <p className="text-sm text-muted-foreground" data-testid="text-searching">
                Searching...
              </p>
            )}
            
            {searchResults && searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive" data-testid="text-duplicates-found">
                  Found {searchResults.length} existing patient(s):
                </p>
                {searchResults.map((patient: Patient) => (
                  <Card key={patient.id} className="border-destructive/20">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium" data-testid={`text-patient-name-${patient.id}`}>
                            {patient.firstName} {patient.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-patient-details-${patient.id}`}>
                            {patient.phone} • {patient.email}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => selectExistingPatient(patient)}
                          data-testid={`button-select-patient-${patient.id}`}
                        >
                          View Patient
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            <Button
              variant="link"
              onClick={() => setShowSearch(false)}
              className="p-0 h-auto text-xs"
              data-testid="button-hide-search"
            >
              Hide search and continue with new registration
            </Button>
          </div>
        )}

        <MultiStepForm steps={steps} currentStep={currentStep}>
          <form className="space-y-6">
            {/* Step 1: Personal Details + Photo */}
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
                      <p className="text-sm text-destructive" data-testid="error-first-name">
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
                      <p className="text-sm text-destructive" data-testid="error-last-name">
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
                      <p className="text-sm text-destructive" data-testid="error-date-of-birth">
                        {form.formState.errors.dateOfBirth.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select onValueChange={(value: "male" | "female" | "other") => form.setValue("gender", value)}>
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
                <div className="space-y-4">
                  <Label>Profile Photo</Label>
                  {photoPreview ? (
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <img
                          src={photoPreview}
                          alt="Profile preview"
                          className="w-32 h-32 rounded-lg object-cover border"
                          data-testid="img-photo-preview"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0"
                          onClick={removePhoto}
                          data-testid="button-remove-photo"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground" data-testid="text-photo-info">
                        {photoFile && (
                          <>
                            {photoFile.name} ({formatFileSize(photoFile.size)})
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleFileChange}
                        className="hidden"
                        id="photo-upload"
                        data-testid="input-photo-upload"
                      />
                      <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Drop photo here or{" "}
                        <Button 
                          type="button" 
                          variant="link" 
                          className="p-0 h-auto font-medium text-primary"
                          onClick={() => document.getElementById('photo-upload')?.click()}
                          data-testid="button-browse-photo"
                        >
                          browse
                        </Button>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                    </div>
                  )}
                  
                  {photoError && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription data-testid="error-photo-upload">
                        {photoError}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Contact Info */}
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
                      <p className="text-sm text-destructive" data-testid="error-phone">
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
                      <p className="text-sm text-destructive" data-testid="error-email">
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Emergency Contact *</CardTitle>
                    <CardDescription>
                      Person to contact in case of emergency
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="emergencyName">Contact Name *</Label>
                        <Input
                          id="emergencyName"
                          {...form.register("emergencyContact.name")}
                          placeholder="Emergency contact name"
                          data-testid="input-emergency-name"
                        />
                        {form.formState.errors.emergencyContact?.name && (
                          <p className="text-sm text-destructive" data-testid="error-emergency-name">
                            {form.formState.errors.emergencyContact.name.message}
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="emergencyPhone">Contact Phone *</Label>
                        <Input
                          id="emergencyPhone"
                          {...form.register("emergencyContact.phone")}
                          placeholder="Emergency contact phone"
                          data-testid="input-emergency-phone"
                        />
                        {form.formState.errors.emergencyContact?.phone && (
                          <p className="text-sm text-destructive" data-testid="error-emergency-phone">
                            {form.formState.errors.emergencyContact.phone.message}
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="emergencyRelationship">Relationship *</Label>
                        <Input
                          id="emergencyRelationship"
                          {...form.register("emergencyContact.relationship")}
                          placeholder="Relationship to patient"
                          data-testid="input-emergency-relationship"
                        />
                        {form.formState.errors.emergencyContact?.relationship && (
                          <p className="text-sm text-destructive" data-testid="error-emergency-relationship">
                            {form.formState.errors.emergencyContact.relationship.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Communication Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Communication Preferences</CardTitle>
                    <CardDescription>
                      How would you like to receive notifications?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="emailConsent"
                        checked={form.watch("communicationPreferences.email")}
                        onCheckedChange={(checked) => form.setValue("communicationPreferences.email", checked)}
                        data-testid="switch-email-consent"
                      />
                      <Label htmlFor="emailConsent">Email notifications</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="whatsappConsent"
                        checked={form.watch("communicationPreferences.whatsapp")}
                        onCheckedChange={(checked) => form.setValue("communicationPreferences.whatsapp", checked)}
                        data-testid="switch-whatsapp-consent"
                      />
                      <Label htmlFor="whatsappConsent">WhatsApp notifications</Label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 3: Medical History */}
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

            {/* Step 4: Consent Forms */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Required Consents
                    </CardTitle>
                    <CardDescription>
                      Please review and agree to the following terms to complete registration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="treatmentConsent"
                          checked={form.watch("consentForms.treatmentConsent")}
                          onCheckedChange={(checked) => form.setValue("consentForms.treatmentConsent", checked as boolean)}
                          data-testid="checkbox-treatment-consent"
                        />
                        <div className="space-y-1">
                          <Label htmlFor="treatmentConsent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Treatment Consent *
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            I consent to dental treatment and understand the procedures, risks, and alternatives.
                          </p>
                        </div>
                      </div>
                      {form.formState.errors.consentForms?.treatmentConsent && (
                        <p className="text-sm text-destructive" data-testid="error-treatment-consent">
                          {form.formState.errors.consentForms.treatmentConsent.message}
                        </p>
                      )}

                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="privacyConsent"
                          checked={form.watch("consentForms.privacyPolicyConsent")}
                          onCheckedChange={(checked) => form.setValue("consentForms.privacyPolicyConsent", checked as boolean)}
                          data-testid="checkbox-privacy-consent"
                        />
                        <div className="space-y-1">
                          <Label htmlFor="privacyConsent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Privacy Policy Agreement *
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            I have read and agree to the privacy policy regarding the collection and use of my personal information.
                          </p>
                        </div>
                      </div>
                      {form.formState.errors.consentForms?.privacyPolicyConsent && (
                        <p className="text-sm text-destructive" data-testid="error-privacy-consent">
                          {form.formState.errors.consentForms.privacyPolicyConsent.message}
                        </p>
                      )}

                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="dataConsent"
                          checked={form.watch("consentForms.dataProcessingConsent")}
                          onCheckedChange={(checked) => form.setValue("consentForms.dataProcessingConsent", checked as boolean)}
                          data-testid="checkbox-data-consent"
                        />
                        <div className="space-y-1">
                          <Label htmlFor="dataConsent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Data Processing Consent *
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            I consent to the processing of my health data for treatment, billing, and clinic management purposes.
                          </p>
                        </div>
                      </div>
                      {form.formState.errors.consentForms?.dataProcessingConsent && (
                        <p className="text-sm text-destructive" data-testid="error-data-consent">
                          {form.formState.errors.consentForms.dataProcessingConsent.message}
                        </p>
                      )}

                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="marketingConsent"
                          checked={form.watch("consentForms.marketingConsent")}
                          onCheckedChange={(checked) => form.setValue("consentForms.marketingConsent", checked as boolean)}
                          data-testid="checkbox-marketing-consent"
                        />
                        <div className="space-y-1">
                          <Label htmlFor="marketingConsent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Marketing Communications (Optional)
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            I would like to receive promotional offers and health tips via email and SMS.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 5: Review & Confirm */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Review Patient Information
                    </CardTitle>
                    <CardDescription>
                      Please review all information before submitting
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Personal Details */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Personal Details</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToStep(0)}
                          data-testid="button-edit-personal"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Name:</span>
                          <p data-testid="review-name">{formValues.firstName} {formValues.lastName}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date of Birth:</span>
                          <p data-testid="review-dob">
                            {formValues.dateOfBirth ? new Date(formValues.dateOfBirth).toLocaleDateString() : ''}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Gender:</span>
                          <p data-testid="review-gender">{formValues.gender || 'Not specified'}</p>
                        </div>
                        {photoPreview && (
                          <div>
                            <span className="text-muted-foreground">Profile Photo:</span>
                            <img
                              src={photoPreview}
                              alt="Profile"
                              className="w-16 h-16 rounded object-cover mt-1"
                              data-testid="review-photo"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Contact Information</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToStep(1)}
                          data-testid="button-edit-contact"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Phone:</span>
                          <p data-testid="review-phone">{formValues.phone}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email:</span>
                          <p data-testid="review-email">{formValues.email || 'Not provided'}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Address:</span>
                          <p data-testid="review-address">{formValues.address || 'Not provided'}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Emergency Contact:</span>
                          <p data-testid="review-emergency">
                            {formValues.emergencyContact?.name} ({formValues.emergencyContact?.relationship}) - {formValues.emergencyContact?.phone}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Medical Information */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Medical Information</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToStep(2)}
                          data-testid="button-edit-medical"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Medical History:</span>
                          <p data-testid="review-medical-history">{formValues.medicalHistory || 'None provided'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Allergies:</span>
                          <p data-testid="review-allergies">{formValues.allergies || 'None provided'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Consent Status */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Consent Status</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToStep(3)}
                          data-testid="button-edit-consent"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className={`w-4 h-4 ${formValues.consentForms?.treatmentConsent ? 'text-green-600' : 'text-red-600'}`} />
                          <span data-testid="review-treatment-consent">Treatment Consent</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className={`w-4 h-4 ${formValues.consentForms?.privacyPolicyConsent ? 'text-green-600' : 'text-red-600'}`} />
                          <span data-testid="review-privacy-consent">Privacy Policy</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className={`w-4 h-4 ${formValues.consentForms?.dataProcessingConsent ? 'text-green-600' : 'text-red-600'}`} />
                          <span data-testid="review-data-consent">Data Processing</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className={`w-4 h-4 ${formValues.consentForms?.marketingConsent ? 'text-green-600' : 'text-gray-400'}`} />
                          <span data-testid="review-marketing-consent">Marketing Communications</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </form>
        </MultiStepForm>

        {/* Form Actions */}
        <div className="flex justify-between pt-6 border-t border-border">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={currentStep === 0 || isLoading}
            data-testid="button-previous"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <Button 
            onClick={nextStep}
            disabled={isLoading}
            data-testid="button-next"
          >
            {isLoading ? (
              "Processing..."
            ) : isLastStep ? (
              "Register Patient"
            ) : (
              <>
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}