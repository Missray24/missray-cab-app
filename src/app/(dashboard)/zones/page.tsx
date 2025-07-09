'use client'

import Image from "next/image";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { zones } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { paymentMethods } from "@/lib/types";

export default function ZonesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Zones">
        <Button>Add Zone</Button>
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {zones.map((zone) => (
          <Card key={zone.id} className="flex flex-col">
            <CardHeader>
               <CardTitle className="font-headline flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {zone.name}
              </CardTitle>
              <CardDescription>{zone.region}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 flex-grow">
               <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Details</h4>
                 <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active Drivers:</span>
                      <span className="font-medium text-foreground">{zone.activeDrivers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Free Waiting:</span>
                      <span className="font-medium text-foreground">{zone.freeWaitingMinutes} min</span>
                    </div>
                     <div className="flex justify-between">
                      <span className="text-muted-foreground">No-show Delay:</span>
                      <span className="font-medium text-foreground">{zone.minutesBeforeNoShow} min</span>
                    </div>
                 </div>
               </div>
               <div>
                 <h4 className="text-sm font-medium my-2 text-muted-foreground">Payment Methods</h4>
                 <div className="flex flex-wrap gap-1">
                    {zone.paymentMethods.map(method => (
                      <Badge key={method} variant="secondary">{method}</Badge>
                    ))}
                 </div>
               </div>
            </CardContent>
            <CardFooter>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    Manage Zone
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Manage Zone: {zone.name}</DialogTitle>
                    <DialogDescription>
                      Draw the zone on the map and set its parameters.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                    <div className="md:col-span-2">
                      <Label>Zone Area</Label>
                      <div className="mt-2 rounded-lg overflow-hidden border">
                        <Image
                          src="https://placehold.co/800x400.png"
                          alt="Map of the zone"
                          data-ai-hint="city map"
                          width={800}
                          height={400}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="space-y-4 pt-2">
                      <div>
                        <Label htmlFor={`free-minutes-${zone.id}`}>Free Waiting (minutes)</Label>
                        <Input id={`free-minutes-${zone.id}`} type="number" defaultValue={zone.freeWaitingMinutes} className="mt-2" />
                      </div>
                      <div>
                        <Label htmlFor={`noshow-minutes-${zone.id}`}>No-show Delay (minutes)</Label>
                        <Input id={`noshow-minutes-${zone.id}`} type="number" defaultValue={zone.minutesBeforeNoShow} className="mt-2" />
                      </div>
                      <Separator />
                      <div>
                        <Label>Payment Methods</Label>
                        <div className="space-y-2 mt-2">
                          {paymentMethods.map(method => (
                            <div key={method} className="flex items-center gap-2">
                              <Checkbox
                                id={`${zone.id}-${method}`}
                                defaultChecked={zone.paymentMethods.includes(method)}
                              />
                              <Label htmlFor={`${zone.id}-${method}`} className="font-normal">{method}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost">Cancel</Button>
                    <Button type="submit">Save changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}