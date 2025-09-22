import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import Appointments from "@/pages/appointments";
import Prescriptions from "@/pages/prescriptions";

function AuthenticatedLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/patients" component={Patients} />
        <Route path="/appointments" component={Appointments} />
        <Route path="/prescriptions" component={Prescriptions} />
        <Route path="/">
          <Redirect to="/dashboard" />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {user ? (
        <Route path="/login">
          <Redirect to="/dashboard" />
        </Route>
      ) : (
        <Route path="/login" component={Login} />
      )}
      
      {user ? (
        <Route>
          <AuthenticatedLayout />
        </Route>
      ) : (
        <Route>
          <Redirect to="/login" />
        </Route>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
