import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { PrescriptionBuilder } from "@/components/prescriptions/prescription-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Mail, MessageCircle, Calendar, User, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Prescription, Patient, User as UserType } from "@shared/schema";

interface PrescriptionWithDetails extends Prescription {
  patient: Patient;
  doctor: UserType;
}

export default function Prescriptions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: prescriptions = [], isLoading } = useQuery<PrescriptionWithDetails[]>({
    queryKey: ['/api/prescriptions'],
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: (prescriptionId: string) =>
      apiRequest('POST', `/api/prescriptions/${prescriptionId}/whatsapp`, {}),
    onSuccess: async (response) => {
      const data = await response.json();
      window.open(data.whatsappUrl, '_blank');
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      toast({
        title: "WhatsApp Opened",
        description: "Please send the message to complete the delivery",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate WhatsApp link",
        variant: "destructive",
      });
    },
  });

  const filteredPrescriptions = prescriptions.filter(prescription =>
    searchQuery === "" ||
    prescription.patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prescription.patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prescription.doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (prescription.medications as any)?.some((med: any) => 
      med.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const getPatientInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getMedicationSummary = (medications: any) => {
    if (!medications || !Array.isArray(medications) || medications.length === 0) {
      return "No medications";
    }
    const first = medications[0];
    const count = medications.length;
    return count > 1 ? `${first.name} (+${count - 1} more)` : first.name;
  };

  const handleWhatsAppSend = (prescriptionId: string) => {
    sendWhatsAppMutation.mutate(prescriptionId);
  };

  return (
    <div className="flex-1 overflow-hidden">
      <Header title="Prescription Management" subtitle="Manage patient prescriptions and deliveries" />
      
      <div className="p-6 overflow-y-auto h-full">
        {/* Search and Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative max-w-md flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search prescriptions..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-prescriptions"
            />
          </div>
          
          <Button 
            onClick={() => setShowBuilder(true)}
            data-testid="button-create-prescription"
          >
            <FileText className="w-4 h-4 mr-2" />
            Create Prescription
          </Button>
        </div>

        {/* Prescriptions List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-24 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredPrescriptions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No prescriptions found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 
                "No prescriptions match your search criteria." : 
                "No prescriptions have been created yet."
              }
            </p>
            <Button 
              onClick={() => setShowBuilder(true)}
              data-testid="button-create-first-prescription"
            >
              <FileText className="w-4 h-4 mr-2" />
              Create Prescription
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPrescriptions.map((prescription) => (
              <Card 
                key={prescription.id}
                className="hover:shadow-md transition-shadow"
                data-testid={`prescription-card-${prescription.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-semibold">
                          {getPatientInitials(prescription.patient.firstName, prescription.patient.lastName)}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-foreground">
                            {prescription.patient.firstName} {prescription.patient.lastName}
                          </h3>
                          <Badge variant="outline">
                            ID: P-{prescription.id.slice(-6)}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>{prescription.doctor.name}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(prescription.createdAt || new Date())} at {formatTime((prescription.createdAt || new Date()).toString())}</span>
                            </div>
                          </div>
                          
                          <div className="text-sm">
                            <p className="font-medium text-foreground">
                              {getMedicationSummary(prescription.medications)}
                            </p>
                            
                            {prescription.medications && Array.isArray(prescription.medications) && (
                              <div className="mt-2 space-y-1">
                                {prescription.medications.slice(0, 2).map((med: any, index: number) => (
                                  <p key={index} className="text-muted-foreground text-xs">
                                    {med.name} {med.dosage} - {med.frequency} for {med.duration}
                                  </p>
                                ))}
                                {prescription.medications.length > 2 && (
                                  <p className="text-muted-foreground text-xs">
                                    +{prescription.medications.length - 2} more medications
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {/* Email Status */}
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={prescription.emailSent ? "text-green-600" : "text-muted-foreground"}
                          title={prescription.emailSent ? "Email sent" : "Email not sent"}
                          data-testid={`email-status-${prescription.id}`}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        {prescription.emailSent && (
                          <Badge className="bg-green-100 text-green-800 text-xs">Sent</Badge>
                        )}
                      </div>
                      
                      {/* WhatsApp Status */}
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={prescription.whatsappSent ? "text-green-600" : "text-muted-foreground hover:text-green-600"}
                          onClick={() => handleWhatsAppSend(prescription.id)}
                          disabled={sendWhatsAppMutation.isPending}
                          title={prescription.whatsappSent ? "Sent via WhatsApp" : "Send via WhatsApp"}
                          data-testid={`whatsapp-button-${prescription.id}`}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        {prescription.whatsappSent ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">Sent</Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleWhatsAppSend(prescription.id)}
                            disabled={sendWhatsAppMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1"
                            data-testid={`send-whatsapp-${prescription.id}`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Send
                          </Button>
                        )}
                      </div>
                      
                      {prescription.pdfUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(prescription.pdfUrl!, '_blank')}
                          data-testid={`view-pdf-${prescription.id}`}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          View PDF
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Mock Prescription Builder - would need encounter context in real implementation */}
      {showBuilder && (
        <PrescriptionBuilder
          open={showBuilder}
          onOpenChange={setShowBuilder}
          encounterId="mock-encounter-id"
          patientId="mock-patient-id"
          doctorId="mock-doctor-id"
        />
      )}
    </div>
  );
}
