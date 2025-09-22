import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "@shared/schema";

export function DoctorAvailability() {
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const doctors = users.filter(user => user.role === 'doctor');

  const getAvailabilityStatus = (doctor: User) => {
    // Mock availability logic - in real app, this would be dynamic
    const statuses = ['available', 'busy', 'off-duty'];
    const statusIndex = doctor.id.length % 3;
    return statuses[statusIndex];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-100 text-green-800">Available</Badge>;
      case 'busy':
        return <Badge className="bg-yellow-100 text-yellow-800">Busy</Badge>;
      case 'off-duty':
        return <Badge className="bg-red-100 text-red-800">Off Duty</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDoctorInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Doctor Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="space-y-1">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-3 bg-muted rounded w-20"></div>
                  </div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
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
        <CardTitle>Doctor Availability</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {doctors.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No doctors found</p>
          ) : (
            doctors.map((doctor) => {
              const status = getAvailabilityStatus(doctor);
              return (
                <div 
                  key={doctor.id} 
                  className="flex items-center justify-between"
                  data-testid={`doctor-availability-${doctor.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                      <span className="text-primary font-semibold text-sm">
                        {getDoctorInitials(doctor.name)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{doctor.name}</h4>
                      <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
                    </div>
                  </div>
                  {getStatusBadge(status)}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
