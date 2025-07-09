
'use client';

import { useState, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { Client } from "@/lib/types";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({ name: '', email: '', phone: '' });
  const [editFormData, setEditFormData] = useState({ name: '', email: '', phone: '' });
  const { toast } = useToast();

  const fetchClients = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "clients"));
      const clientsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Client[];
      setClients(clientsData);
    } catch (error) {
      console.error("Error fetching clients: ", error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de charger les clients." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (editingClient) {
      setEditFormData({ name: editingClient.name, email: editingClient.email, phone: editingClient.phone });
    }
  }, [editingClient]);

  const handleToggleBlock = async (clientToToggle: Client) => {
    try {
      const clientRef = doc(db, "clients", clientToToggle.id);
      const newStatus = clientToToggle.status === 'Active' ? 'Blocked' : 'Active';
      await updateDoc(clientRef, { status: newStatus });
      setClients(clients.map(client =>
        client.id === clientToToggle.id
          ? { ...client, status: newStatus }
          : client
      ));
      toast({ title: "Succès", description: "Le statut du client a été mis à jour." });
    } catch (error) {
      console.error("Error updating client status: ", error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour le statut du client." });
    }
  };

  const handleDelete = async () => {
    if (!deletingClient) return;
    try {
      await deleteDoc(doc(db, "clients", deletingClient.id));
      setClients(clients.filter(client => client.id !== deletingClient.id));
      toast({ title: "Succès", description: "Le client a été supprimé." });
    } catch (error) {
        console.error("Error deleting client: ", error);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer le client." });
    } finally {
        setDeletingClient(null);
    }
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleAddFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setAddFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveChanges = async () => {
    if (!editingClient) return;
    try {
      const clientRef = doc(db, "clients", editingClient.id);
      await updateDoc(clientRef, editFormData);
      setClients(clients.map(client =>
        client.id === editingClient.id
          ? { ...client, ...editFormData }
          : client
      ));
      toast({ title: "Succès", description: "Les informations du client ont été mises à jour." });
    } catch (error) {
        console.error("Error updating client: ", error);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour les informations." });
    } finally {
        setEditingClient(null);
    }
  };

  const handleAddClient = async () => {
    if (!addFormData.name || !addFormData.email || !addFormData.phone) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez remplir tous les champs." });
      return;
    }
    try {
      const newClient = {
        ...addFormData,
        joinDate: new Date().toLocaleDateString('fr-CA'), // YYYY-MM-DD
        status: 'Active' as const,
      };
      const docRef = await addDoc(collection(db, "clients"), newClient);
      setClients(prev => [...prev, { id: docRef.id, ...newClient }]);
      setIsAddDialogOpen(false);
      setAddFormData({ name: '', email: '', phone: '' });
      toast({ title: "Succès", description: "Le nouveau client a été ajouté." });
    } catch (error) {
      console.error("Error adding client: ", error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'ajouter le client." });
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader title="Clients">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add Client</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un nouveau client</DialogTitle>
                <DialogDescription>
                  Remplissez les détails pour créer un nouveau client.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom</Label>
                  <Input id="name" value={addFormData.name} onChange={handleAddFormChange} placeholder="Jean Dupont" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={addFormData.email} onChange={handleAddFormChange} placeholder="jean@exemple.com" />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input id="phone" type="tel" value={addFormData.phone} onChange={handleAddFormChange} placeholder="+33 6 12 34 56 78" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleAddClient}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>All Clients</CardTitle>
            <CardDescription>
              Manage customer accounts and information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-[70px] rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>
                        <Badge variant={client.status === 'Active' ? 'secondary' : 'destructive'}>
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{client.joinDate}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => setEditingClient(client)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleToggleBlock(client)}>{client.status === 'Active' ? 'Block' : 'Unblock'}</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setDeletingClient(client)} className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit Client Dialog */}
      <Dialog open={!!editingClient} onOpenChange={(isOpen) => !isOpen && setEditingClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client: {editingClient?.name}</DialogTitle>
            <DialogDescription>
              Update the client's details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={editFormData.name} onChange={handleEditFormChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={editFormData.email} onChange={handleEditFormChange} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" type="tel" value={editFormData.phone} onChange={handleEditFormChange} />
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingClient(null)}>Cancel</Button>
            <Button onClick={handleSaveChanges}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingClient} onOpenChange={(isOpen) => !isOpen && setDeletingClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the client account for <span className="font-medium">{deletingClient?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
