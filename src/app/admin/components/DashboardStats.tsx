import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, CheckCircle, GraduationCap } from "lucide-react";

export async function DashboardStats() {
  const stats = await prisma.$transaction([
    prisma.user.count(),
    prisma.roadmap.count(),
    prisma.topic.count(),
    prisma.userTopicCompletion.count({
      where: {
        status: 'completed'
      }
    })
  ]);

  const items = [
    { label: "Total Users", value: stats[0], icon: Users },
    { label: "Total Roadmaps", value: stats[1], icon: BookOpen },
    { label: "Total Topics", value: stats[2], icon: GraduationCap },
    { label: "Completed Topics", value: stats[3], icon: CheckCircle },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {item.label}
            </CardTitle>
            <item.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}