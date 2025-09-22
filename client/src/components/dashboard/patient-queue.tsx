import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, MoreVertical } from "lucide-react";

interface PatientQueueItem {
  id: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
  doctor: {
    id: string;
    name: string;
  };
  scheduledAt: string;
  appointmentType: string;
  status: string;
}

export function PatientQueue() {
  const today = new Date().toISOString().split('T')[0];
  const { data: appointments = [], isLoading } = useQuery<PatientQueueItem[]>({
    queryKey: ['/api/appointments', { date: today }],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800">Waiting</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPatientInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Patient Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse p-4 border border-border rounded-lg">
                <div className="h-16 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Today's Patient Queue</CardTitle>
          <div className="flex items-center space-x-2">
            <Select defaultValue="all">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Doctors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                <SelectItem value="dr-smith">Dr. Smith</SelectItem>
                <SelectItem value="dr-johnson">Dr. Johnson</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" data-testid="button-filter">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {appointments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No appointments scheduled for today</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div 
                key={appointment.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-sm transition-shadow"
                data-testid={`patient-queue-item-${appointment.id}`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold text-sm">
                      {getPatientInitials(appointment.patient.firstName, appointment.patient.lastName)}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">
                      {appointment.patient.firstName} {appointment.patient.lastName}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      ID: P-{appointment.patient.id.slice(-6)} | {new Date(appointment.scheduledAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{appointment.appointmentType.replace('_', ' ')}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {getStatusBadge(appointment.status)}
                  
                  {appointment.status === 'scheduled' ? (
                    <Select defaultValue="">
                      <SelectTrigger className="w-32 text-xs">
                        <SelectValue placeholder="Assign Doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dr-smith">Dr. Smith</SelectItem>
                        <SelectItem value="dr-johnson">Dr. Johnson</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-muted-foreground">{appointment.doctor.name}</span>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    data-testid={`button-menu-${appointment.id}`}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {appointments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <Button 
              variant="outline" 
              className="w-full"
              data-testid="button-view-all-patients"
            >
              View All Patients ({appointments.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
