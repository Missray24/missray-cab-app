
'use client';

// This layout ensures the content of the vehicle selection page can fill the screen
// and overlay the map correctly.
export default function SelectVehicleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen">
      {children}
    </div>
  );
}
