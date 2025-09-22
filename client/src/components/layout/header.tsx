import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Search, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="bg-background border-b border-border p-6 flex items-center justify-between">
      <div className="flex items-center space-x-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <p className="text-muted-foreground">{subtitle || `Today, ${today}`}</p>
        </div>
        
        {/* Date Picker */}
        <div className="flex items-center space-x-2">
          <input 
            type="date" 
            className="px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-transparent"
            defaultValue={new Date().toISOString().split('T')[0]}
            data-testid="input-date-picker"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search patients..."
            className="pl-10 w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
        </div>

        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
        </Button>

        {/* User Menu */}
        {user && (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
              <span className="text-primary font-semibold text-sm">
                {user.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>
    </header>
  );
}
