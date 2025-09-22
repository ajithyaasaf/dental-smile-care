import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  BarChart3,
  UserPlus,
  Star,
} from "lucide-react";

const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Patients",
    href: "/patients",
    icon: Users,
  },
  {
    title: "Appointments",
    href: "/appointments",
    icon: Calendar,
  },
  {
    title: "Prescriptions",
    href: "/prescriptions",
    icon: FileText,
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, signOut } = useAuth();

  return (
    <aside className="w-64 bg-primary text-primary-foreground flex-shrink-0 flex flex-col">
      <div className="p-6">
        {/* Clinic Logo & Name */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
            <Star className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">SmileCare Clinic</h1>
            <p className="text-xs text-primary-foreground/70">DCMS v1.0</p>
          </div>
        </div>

        {/* User Profile */}
        {user && (
          <div className="flex items-center space-x-3 mb-8 p-3 bg-primary-foreground/10 rounded-lg">
            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
              <span className="text-primary font-semibold text-sm">
                {user.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-primary-foreground/70 capitalize">{user.role}</p>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg transition-colors w-full text-left",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "hover:bg-primary-foreground/10"
                  )}
                  data-testid={`nav-link-${item.title.toLowerCase()}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.title}</span>
                </a>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Quick Actions */}
      <div className="mt-auto p-6">
        <Link href="/patients/new">
          <Button 
            className="w-full bg-secondary text-primary hover:bg-secondary/90"
            data-testid="button-new-patient"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            New Patient
          </Button>
        </Link>
        
        <Button
          variant="ghost"
          className="w-full mt-2 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
          onClick={signOut}
          data-testid="button-sign-out"
        >
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
