import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { PatientRegistration } from "@/components/patients/patient-registration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Phone, Mail, Calendar } from "lucide-react";
import type { Patient } from "@shared/schema";

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showRegistration, setShowRegistration] = useState(false);

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ['/api/patients', { search: searchQuery }],
    enabled: searchQuery.length > 0 || searchQuery === "",
  });

  const getPatientInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getAge = (dateOfBirth: string | Date) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <div className="flex-1 overflow-hidden">
      <Header title="Patient Management" subtitle="Manage patient records and information" />
      
      <div className="p-6 overflow-y-auto h-full">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search patients by name, phone, or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-patients"
              />
            </div>
          </div>
          
          <Button 
            onClick={() => setShowRegistration(true)}
            data-testid="button-register-patient"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Register Patient
          </Button>
        </div>

        {/* Patient Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-32 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No patients found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 
                "No patients match your search criteria." : 
                "Get started by registering your first patient."
              }
            </p>
            <Button 
              onClick={() => setShowRegistration(true)}
              data-testid="button-register-first-patient"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Register Patient
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((patient) => (
              <Card 
                key={patient.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                data-testid={`patient-card-${patient.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {getPatientInitials(patient.firstName, patient.lastName)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg truncate">
                        {patient.firstName} {patient.lastName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        ID: P-{patient.id.slice(-6)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {getAge(patient.dateOfBirth)} years old
                    </span>
                    {patient.gender && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <Badge variant="secondary" className="capitalize">
                          {patient.gender}
                        </Badge>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{patient.phone}</span>
                  </div>
                  
                  {patient.email && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground truncate">{patient.email}</span>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Registered: {formatDate(patient.createdAt || new Date())}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <PatientRegistration 
        open={showRegistration} 
        onOpenChange={setShowRegistration} 
      />
    </div>
  );
}
