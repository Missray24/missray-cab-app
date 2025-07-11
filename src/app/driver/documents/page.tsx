
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Trash2, Upload, Image as ImageIcon, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Image from 'next/image';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { auth, db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { type User, type DriverDocument } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const documentSchema = z.object({
  name: z.string().min(1, "Nom du document requis"),
  type: z.string().min(1, "Type de document requis"),
  file: z.instanceof(FileList).refine(files => files.length > 0, 'Un fichier est requis.'),
});


export default function DriverDocumentsPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [documents, setDocuments] = useState<DriverDocument[]>([]);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const { register: registerDoc, handleSubmit: handleSubmitDoc, reset: resetDoc, watch: watchDoc, formState: { errors: docErrors, isSubmitting } } = useForm<z.infer<typeof documentSchema>>({ resolver: zodResolver(documentSchema) });
    const docFile = watchDoc("file");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setLoading(true);
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("uid", "==", currentUser.uid));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const userData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as User;
                setUser(userData);
                setDocuments(userData.driverProfile?.documents || []);
            }
            setLoading(false);
        } else {
            setLoading(false);
        }
        });
        return () => unsubscribe();
    }, []);

    const updateUserData = async (dataToUpdate: object, successMessage: string) => {
      if (!user) return;
      try {
          const userRef = doc(db, "users", user.id);
          await updateDoc(userRef, dataToUpdate);
          toast({ title: 'Succès', description: successMessage });
      } catch (error) {
          console.error('Error updating documents:', error);
          toast({ variant: 'destructive', title: 'Erreur', description: 'Mise à jour échouée.' });
      }
    };
  
    const handleDocumentSubmit = async (data: z.infer<typeof documentSchema>) => {
        if (!user || !data.file) return;
        
        const file = data.file[0];
        const storageRef = ref(storage, `driver-documents/${user.uid}/${Date.now()}_${file.name}`);
        
        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const newDocument: DriverDocument = {
                name: data.name,
                type: data.type,
                url: downloadURL,
                status: 'Pending',
            };

            const updatedDocuments = [...documents, newDocument];
            await updateUserData({ 'driverProfile.documents': updatedDocuments }, 'Document téléversé.');
            setDocuments(updatedDocuments);
            setIsDocModalOpen(false);

        } catch (error) {
            console.error("Error uploading document:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de téléverser le document.' });
        }
    };
  
    const handleDeleteDocument = async (docToDelete: DriverDocument) => {
        if (!user) return;
        try {
            // Delete from storage
            const fileRef = ref(storage, docToDelete.url);
            await deleteObject(fileRef);

            // Delete from Firestore
            const updatedDocuments = documents.filter(d => d.url !== docToDelete.url);
            await updateUserData({ 'driverProfile.documents': updatedDocuments }, 'Document supprimé.');
            setDocuments(updatedDocuments);
            toast({ title: 'Succès', description: 'Document supprimé.' });
        } catch(error) {
            console.error("Error deleting document:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer le document.' });
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="Mes Documents" />
             <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div className="space-y-1.5">
                        <CardTitle>Documents Officiels</CardTitle>
                        <CardDescription>Téléversez vos documents obligatoires (VTC, etc.). L'admin les vérifiera.</CardDescription>
                    </div>
                    <Button type="button" onClick={() => { resetDoc(); setIsDocModalOpen(true); }}>
                        <Upload className="mr-2"/>Téléverser
                    </Button>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loading ? (
                        Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
                    ) : documents.length > 0 ? documents.map(doc => (
                        <Card key={doc.url} className="group">
                           <div className="aspect-video w-full rounded-t-lg overflow-hidden border-b relative">
                                <Image src={doc.url} alt={doc.name} layout="fill" objectFit="cover" data-ai-hint="official document" />
                                <div className="absolute top-2 right-2">
                                    <Badge className={cn("capitalize items-center", {"bg-green-100 text-green-800 border-green-200": doc.status === 'Approved', "bg-red-100 text-red-800 border-red-200": doc.status === 'Rejected', "bg-yellow-100 text-yellow-800 border-yellow-200": doc.status === 'Pending' })}>
                                        {doc.status === 'Approved' && <CheckCircle className="mr-1 h-3 w-3" />} 
                                        {doc.status === 'Rejected' && <XCircle className="mr-1 h-3 w-3" />} 
                                        {doc.status === 'Pending' && <AlertCircle className="mr-1 h-3 w-3" />} 
                                        {doc.status}
                                    </Badge>
                                </div>
                           </div>
                           <CardContent className="p-4 flex items-center justify-between">
                               <div>
                                    <p className="font-semibold">{doc.name}</p>
                                    <p className="text-sm text-muted-foreground">{doc.type}</p>
                                </div>
                               <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => handleDeleteDocument(doc)}>
                                    <Trash2 className="h-4 w-4 text-destructive"/>
                               </Button>
                           </CardContent>
                        </Card>
                    )) : <p className="text-muted-foreground text-center py-8 col-span-full">Aucun document téléversé.</p>}
                </CardContent>
            </Card>

            <Dialog open={isDocModalOpen} onOpenChange={setIsDocModalOpen}>
                <DialogContent><form onSubmit={handleSubmitDoc(handleDocumentSubmit)}>
                <DialogHeader><DialogTitle>Téléverser un document</DialogTitle><DialogDescription>Choisissez un fichier et donnez-lui un nom.</DialogDescription></DialogHeader>
                <div className="space-y-4 py-4">
                    <div><Label htmlFor="name">Nom du document</Label><Input id="name" {...registerDoc("name")} placeholder="Ex: Carte VTC" /><p className="text-destructive text-xs mt-1">{docErrors.name?.message}</p></div>
                    <div><Label htmlFor="type">Type</Label><Input id="type" {...registerDoc("type")} placeholder="Ex: Justificatif officiel" /><p className="text-destructive text-xs mt-1">{docErrors.type?.message}</p></div>
                    <div><Label htmlFor="file">Fichier</Label><Input id="file" type="file" {...registerDoc("file")} accept="image/*,application/pdf" /><p className="text-destructive text-xs mt-1">{docErrors.file?.message}</p></div>
                    {docFile?.[0] && <div className="text-center"><ImageIcon className="h-16 w-16 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground mt-2 truncate">{docFile[0].name}</p></div>}
                </div>
                <DialogFooter><Button variant="outline" type="button" onClick={() => setIsDocModalOpen(false)}>Annuler</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Envoi..." : "Téléverser"}</Button></DialogFooter>
                </form></DialogContent>
            </Dialog>
        </div>
    )
}
