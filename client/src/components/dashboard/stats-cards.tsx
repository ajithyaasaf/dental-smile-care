import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface DashboardStats {
  todayPatients: number;
  completed: number;
  inProgress: number;
  pending: number;
}

export function StatsCards() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  const cards = [
    {
      title: "Today's Patients",
      value: stats?.todayPatients || 0,
      icon: Users,
      bgColor: "bg-secondary/20",
      iconColor: "text-secondary",
      change: "+8%",
      changeText: "from yesterday",
      changeColor: "text-green-600",
      testId: "stat-today-patients"
    },
    {
      title: "Completed",
      value: stats?.completed || 0,
      icon: CheckCircle,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      change: "67%",
      changeText: "completion rate",
      changeColor: "text-green-600",
      testId: "stat-completed"
    },
    {
      title: "In Progress",
      value: stats?.inProgress || 0,
      icon: Clock,
      bgColor: "bg-yellow-100",
      iconColor: "text-yellow-600",
      change: "Avg wait:",
      changeText: "15 mins",
      changeColor: "text-foreground",
      testId: "stat-in-progress"
    },
    {
      title: "Pending",
      value: stats?.pending || 0,
      icon: AlertTriangle,
      bgColor: "bg-red-100",
      iconColor: "text-red-600",
      change: "High priority",
      changeText: "",
      changeColor: "text-red-600",
      testId: "stat-pending"
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <Card key={card.title} data-testid={card.testId}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">{card.title}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                <card.icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <span className={`font-medium ${card.changeColor}`}>{card.change}</span>
              {card.changeText && (
                <span className="text-muted-foreground ml-1">{card.changeText}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
