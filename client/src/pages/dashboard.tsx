import { Header } from "@/components/layout/header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { PatientQueue } from "@/components/dashboard/patient-queue";
import { DoctorAvailability } from "@/components/dashboard/doctor-availability";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Mail, MessageCircle, UserPlus, Calendar, FileText } from "lucide-react";

interface RecentPrescription {
  id: string;
  patient: { firstName: string; lastName: string };
  doctor: { name: string };
  medications: Array<{ name: string; dosage: string }>;
  emailSent: boolean;
  whatsappSent: boolean;
  createdAt: string;
}

export default function Dashboard() {
  const { data: recentPrescriptions = [] } = useQuery<RecentPrescription[]>({
    queryKey: ['/api/prescriptions'],
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="flex-1 overflow-hidden">
      <Header title="Dashboard" />
      
      <div className="p-6 overflow-y-auto h-full">
        {/* Stats Cards */}
        <div className="mb-8">
          <StatsCards />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Patient Queue - Takes 2 columns */}
          <div className="lg:col-span-2">
            <PatientQueue />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-8">
            {/* Doctor Availability */}
            <DoctorAvailability />

            {/* Recent Prescriptions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Prescriptions</CardTitle>
                  <Link href="/prescriptions">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      data-testid="link-view-all-prescriptions"
                    >
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentPrescriptions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No recent prescriptions
                    </p>
                  ) : (
                    recentPrescriptions.slice(0, 3).map((prescription) => (
                      <div 
                        key={prescription.id} 
                        className="flex items-center justify-between"
                        data-testid={`prescription-item-${prescription.id}`}
                      >
                        <div>
                          <h4 className="font-medium text-foreground text-sm">
                            {prescription.medications[0]?.name} {prescription.medications[0]?.dosage}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Patient: {prescription.patient.firstName} {prescription.patient.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {prescription.doctor.name} - {formatTime(prescription.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={prescription.emailSent ? "text-green-600" : "text-muted-foreground"}
                            title={prescription.emailSent ? "Email sent" : "Email not sent"}
                            data-testid={`email-status-${prescription.id}`}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={prescription.whatsappSent ? "text-green-600" : "text-muted-foreground hover:text-green-600"}
                            title={prescription.whatsappSent ? "Sent via WhatsApp" : "Send via WhatsApp"}
                            data-testid={`whatsapp-button-${prescription.id}`}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link href="/patients/new">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      data-testid="button-register-patient"
                    >
                      <UserPlus className="w-5 h-5 text-primary mr-3" />
                      <span className="font-medium">Register New Patient</span>
                    </Button>
                  </Link>
                  
                  <Link href="/appointments/new">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      data-testid="button-schedule-appointment"
                    >
                      <Calendar className="w-5 h-5 text-primary mr-3" />
                      <span className="font-medium">Schedule Appointment</span>
                    </Button>
                  </Link>
                  
                  <Link href="/prescriptions/new">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      data-testid="button-create-prescription"
                    >
                      <FileText className="w-5 h-5 text-primary mr-3" />
                      <span className="font-medium">Create Prescription</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
