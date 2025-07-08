import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { zones } from "@/lib/data";

export default function ZonesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Zones">
        <Button>Add Zone</Button>
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {zones.map((zone) => (
          <Card key={zone.id}>
            <CardHeader>
              <CardTitle className="font-headline">{zone.name}</CardTitle>
              <CardDescription>{zone.region}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <span className="font-medium text-foreground">Active Drivers: </span>
                <span className="text-primary font-bold">{zone.activeDrivers}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                Manage Zone
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
