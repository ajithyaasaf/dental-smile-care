import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertPrescriptionSchema } from "@shared/schema";
import { z } from "zod";
import { Plus, Trash2, Mail, MessageCircle, ExternalLink } from "lucide-react";

const medicationSchema = z.object({
  name: z.string().min(1, "Medication name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  duration: z.string().min(1, "Duration is required"),
  instructions: z.string().optional(),
});

const prescriptionFormSchema = insertPrescriptionSchema.extend({
  medications: z.array(medicationSchema).min(1, "At least one medication is required"),
});

type PrescriptionFormData = z.infer<typeof prescriptionFormSchema>;

interface PrescriptionBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encounterId: string;
  patientId: string;
  doctorId: string;
}

export function PrescriptionBuilder({ 
  open, 
  onOpenChange, 
  encounterId,
  patientId,
  doctorId
}: PrescriptionBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [whatsappUrl, setWhatsappUrl] = useState<string>("");

  const form = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionFormSchema),
    defaultValues: {
      encounterId,
      patientId,
      doctorId,
      medications: [
        {
          name: "",
          dosage: "",
          frequency: "",
          duration: "",
          instructions: "",
        }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "medications",
  });

  const createPrescriptionMutation = useMutation({
    mutationFn: (data: PrescriptionFormData) =>
      apiRequest('POST', '/api/prescriptions', data),
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      toast({
        title: "Success",
        description: "Prescription created and emailed to patient",
      });
      
      // Generate WhatsApp link
      const responseData = await response.json();
      generateWhatsappLink(responseData.id);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create prescription",
        variant: "destructive",
      });
    },
  });

  const generateWhatsappLink = async (prescriptionId: string) => {
    try {
      const response = await apiRequest('POST', `/api/prescriptions/${prescriptionId}/whatsapp`, {});
      const data = await response.json();
      setWhatsappUrl(data.whatsappUrl);
    } catch (error) {
      console.error('Failed to generate WhatsApp link:', error);
    }
  };

  const onSubmit = (data: PrescriptionFormData) => {
    createPrescriptionMutation.mutate(data);
  };

  const addMedication = () => {
    append({
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
    });
  };

  const sendWhatsApp = () => {
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank');
      toast({
        title: "WhatsApp Opened",
        description: "Please send the message to complete the delivery",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Prescription</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Medications</h3>
                
                {fields.map((field, index) => (
                  <Card key={field.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Medication {index + 1}</CardTitle>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            data-testid={`button-remove-medication-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`medication-name-${index}`}>Medication Name *</Label>
                        <Input
                          id={`medication-name-${index}`}
                          {...form.register(`medications.${index}.name`)}
                          placeholder="e.g., Amoxicillin"
                          data-testid={`input-medication-name-${index}`}
                        />
                        {form.formState.errors.medications?.[index]?.name && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.medications[index]?.name?.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`medication-dosage-${index}`}>Dosage *</Label>
                          <Input
                            id={`medication-dosage-${index}`}
                            {...form.register(`medications.${index}.dosage`)}
                            placeholder="e.g., 500mg"
                            data-testid={`input-medication-dosage-${index}`}
                          />
                          {form.formState.errors.medications?.[index]?.dosage && (
                            <p className="text-sm text-destructive">
                              {form.formState.errors.medications[index]?.dosage?.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`medication-frequency-${index}`}>Frequency *</Label>
                          <Select onValueChange={(value) => form.setValue(`medications.${index}.frequency`, value)}>
                            <SelectTrigger data-testid={`select-frequency-${index}`}>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="once-daily">Once daily</SelectItem>
                              <SelectItem value="twice-daily">Twice daily</SelectItem>
                              <SelectItem value="three-times-daily">Three times daily</SelectItem>
                              <SelectItem value="four-times-daily">Four times daily</SelectItem>
                              <SelectItem value="as-needed">As needed</SelectItem>
                              <SelectItem value="before-meals">Before meals</SelectItem>
                              <SelectItem value="after-meals">After meals</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`medication-duration-${index}`}>Duration *</Label>
                        <Select onValueChange={(value) => form.setValue(`medications.${index}.duration`, value)}>
                          <SelectTrigger data-testid={`select-duration-${index}`}>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3-days">3 days</SelectItem>
                            <SelectItem value="5-days">5 days</SelectItem>
                            <SelectItem value="7-days">7 days</SelectItem>
                            <SelectItem value="10-days">10 days</SelectItem>
                            <SelectItem value="14-days">14 days</SelectItem>
                            <SelectItem value="30-days">30 days</SelectItem>
                            <SelectItem value="as-needed">As needed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`medication-instructions-${index}`}>Special Instructions</Label>
                        <Textarea
                          id={`medication-instructions-${index}`}
                          {...form.register(`medications.${index}.instructions`)}
                          placeholder="e.g., Take with food, Avoid alcohol..."
                          rows={2}
                          data-testid={`textarea-instructions-${index}`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addMedication}
                  className="w-full"
                  data-testid="button-add-medication"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Medication
                </Button>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-border">
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
                  disabled={createPrescriptionMutation.isPending}
                  data-testid="button-create-prescription"
                >
                  {createPrescriptionMutation.isPending ? "Creating..." : "Create Prescription"}
                </Button>
              </div>
            </form>
          </div>

          {/* Preview & Delivery Section */}
          <div className="space-y-6">
            {/* Prescription Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Prescription Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center border-b pb-4">
                  <h3 className="font-bold text-lg">SmileCare Clinic</h3>
                  <p className="text-sm text-muted-foreground">Dental Care Prescription</p>
                </div>

                <div className="space-y-3">
                  {form.watch("medications").map((medication, index) => (
                    <div key={index} className="border-l-2 border-primary pl-3 py-2">
                      <h4 className="font-medium">{medication.name || "Medication Name"}</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p><span className="font-medium">Dosage:</span> {medication.dosage || "—"}</p>
                        <p><span className="font-medium">Frequency:</span> {medication.frequency || "—"}</p>
                        <p><span className="font-medium">Duration:</span> {medication.duration || "—"}</p>
                        {medication.instructions && (
                          <p><span className="font-medium">Instructions:</span> {medication.instructions}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Delivery Status */}
            {createPrescriptionMutation.isSuccess && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Delivery Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Email sent automatically</span>
                    <Badge className="bg-green-100 text-green-800">Delivered</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">WhatsApp delivery</span>
                      {whatsappUrl ? (
                        <Badge className="bg-green-100 text-green-800">Ready</Badge>
                      ) : (
                        <Badge variant="secondary">Preparing...</Badge>
                      )}
                    </div>
                    
                    {whatsappUrl && (
                      <Button
                        size="sm"
                        onClick={sendWhatsApp}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid="button-send-whatsapp"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Send via WhatsApp
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
