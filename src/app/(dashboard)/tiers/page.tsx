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
import { serviceTiers } from "@/lib/data";

export default function ServiceTiersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Gammes de Service">
        <Button>Add Service Tier</Button>
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {serviceTiers.map((tier) => (
          <Card key={tier.id}>
            <CardHeader className="flex flex-row items-center gap-4">
               <tier.icon className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="font-headline">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Fare</span>
                <span>${tier.baseFare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rate per km</span>
                <span>${tier.perKm.toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                Edit
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
