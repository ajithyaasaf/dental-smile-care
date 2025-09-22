import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { AppointmentScheduler } from "@/components/appointments/appointment-scheduler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, Plus, Clock, User, MoreVertical } from "lucide-react";
import type { Appointment, Patient, User as UserType } from "@shared/schema";

interface AppointmentWithDetails extends Appointment {
  patient: Patient;
  doctor: UserType;
}

export default function Appointments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [showScheduler, setShowScheduler] = useState(false);

  const { data: appointments = [], isLoading } = useQuery<AppointmentWithDetails[]>({
    queryKey: ['/api/appointments', { date: selectedDate, doctorId: selectedDoctor !== 'all' ? selectedDoctor : undefined }],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
  });

  const doctors = users.filter(user => user.role === 'doctor');

  const filteredAppointments = appointments.filter(appointment =>
    searchQuery === "" ||
    appointment.patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    appointment.patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    appointment.doctor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPatientInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="flex-1 overflow-hidden">
      <Header title="Appointment Management" subtitle="Schedule and manage patient appointments" />
      
      <div className="p-6 overflow-y-auto h-full">
        {/* Filters and Actions */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative max-w-md">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search appointments..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-appointments"
              />
            </div>
            
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
              data-testid="input-appointment-date"
            />
            
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger className="w-48" data-testid="select-doctor-filter">
                <SelectValue placeholder="All Doctors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={() => setShowScheduler(true)}
            data-testid="button-schedule-appointment"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Appointment
          </Button>
        </div>

        {/* Appointments List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No appointments found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedDoctor !== 'all' ? 
                "No appointments match your search criteria." : 
                `No appointments scheduled for ${formatDate(selectedDate)}.`
              }
            </p>
            <Button 
              onClick={() => setShowScheduler(true)}
              data-testid="button-schedule-first-appointment"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Appointment
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => (
              <Card 
                key={appointment.id}
                className="hover:shadow-md transition-shadow"
                data-testid={`appointment-card-${appointment.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {getPatientInitials(appointment.patient?.firstName || '', appointment.patient?.lastName || '')}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-foreground">
                            {appointment.patient?.firstName} {appointment.patient?.lastName}
                          </h3>
                          {getStatusBadge(appointment.status)}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatTime(appointment.scheduledAt.toString())}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>{appointment.doctor.name}</span>
                          </div>
                          
                          <span className="capitalize">
                            {appointment.appointmentType.replace('_', ' ')}
                          </span>
                          
                          <span>{appointment.duration} min</span>
                        </div>
                        
                        {appointment.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {appointment.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        data-testid={`button-edit-${appointment.id}`}
                      >
                        Edit
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        data-testid={`button-menu-${appointment.id}`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AppointmentScheduler 
        open={showScheduler} 
        onOpenChange={setShowScheduler} 
      />
    </div>
  );
}
