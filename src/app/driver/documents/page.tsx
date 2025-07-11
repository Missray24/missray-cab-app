
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Upload, CheckCircle, XCircle, AlertCircle, CalendarIcon } from 'lucide-react';
import Image from 'next/image';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { type User, type DriverDocument, requiredDriverDocs, RequiredDriverDoc } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

const fileUploadSchema = z.object({
  fileRecto: z.instanceof(FileList).optional(),
  fileVerso: z.instanceof(FileList).optional(),
  expirationDate: z.string().optional(),
});

type FileUploadForm = z.infer<typeof fileUploadSchema>;

export default function DriverDocumentsPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [documents, setDocuments] = useState<DriverDocument[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDocRequirement, setSelectedDocRequirement] = useState<RequiredDriverDoc | null>(null);

    const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FileUploadForm>({
        resolver: zodResolver(fileUploadSchema)
    });

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

    const updateUserDataInDb = async (newDocuments: DriverDocument[]) => {
        if (!user) return;
        try {
            const userRef = doc(db, "users", user.id);
            await updateDoc(userRef, { 'driverProfile.documents': newDocuments });
        } catch (error) {
            console.error('Error updating user data:', error);
            throw new Error("Mise à jour échouée.");
        }
    };
  
    const handleFileUpload = async (data: FileUploadForm) => {
        if (!user || !selectedDocRequirement) return;
        
        const driverNamePath = `${user.firstName}-${user.lastName}`.toLowerCase().replace(/\s+/g, '-');
        const existingDoc = documents.find(d => d.id === selectedDocRequirement.id);
        
        try {
            let urlRecto = existingDoc?.url;
            if (data.fileRecto && data.fileRecto.length > 0) {
                const storageRef = ref(storage, `chauffeurs/${driverNamePath}/${selectedDocRequirement.id}_recto_${data.fileRecto[0].name}`);
                const snapshot = await uploadBytes(storageRef, data.fileRecto[0]);
                urlRecto = await getDownloadURL(snapshot.ref);
            }

            let urlVerso = existingDoc?.urlVerso;
            if (selectedDocRequirement.hasVerso && data.fileVerso && data.fileVerso.length > 0) {
                const storageRef = ref(storage, `chauffeurs/${driverNamePath}/${selectedDocRequirement.id}_verso_${data.fileVerso[0].name}`);
                const snapshot = await uploadBytes(storageRef, data.fileVerso[0]);
                urlVerso = await getDownloadURL(snapshot.ref);
            }
            
            if (!urlRecto && !existingDoc) {
                toast({ variant: 'destructive', title: 'Erreur', description: 'Le fichier recto est obligatoire.'});
                return;
            }

            const updatedDoc: DriverDocument = {
                id: selectedDocRequirement.id,
                name: selectedDocRequirement.name,
                type: selectedDocRequirement.type,
                url: urlRecto!,
                urlVerso: urlVerso,
                expirationDate: data.expirationDate || existingDoc?.expirationDate,
                status: 'Pending',
            };
            
            const updatedDocuments = documents.filter(d => d.id !== selectedDocRequirement.id).concat(updatedDoc);

            await updateUserDataInDb(updatedDocuments);
            setDocuments(updatedDocuments);
            toast({ title: 'Succès', description: 'Document mis à jour. Il est en attente de validation.' });
            closeModal();
        } catch (error) {
            console.error("Error uploading document:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour le document.' });
        }
    };
    
    const openModal = (docRequirement: RequiredDriverDoc) => {
        setSelectedDocRequirement(docRequirement);
        const existingDoc = documents.find(d => d.id === docRequirement.id);
        reset({
            expirationDate: existingDoc?.expirationDate ? format(new Date(existingDoc.expirationDate), 'yyyy-MM-dd') : ''
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedDocRequirement(null);
        reset();
    };

    const renderDocumentCard = (docRequirement: RequiredDriverDoc) => {
        const uploadedDoc = documents.find(d => d.id === docRequirement.id);
        const status = uploadedDoc?.status || 'Missing';
        const statusConfig = {
            Pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: AlertCircle, text: "En attente" },
            Approved: { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle, text: "Approuvé" },
            Rejected: { color: "bg-red-100 text-red-800 border-red-200", icon: XCircle, text: "Rejeté" },
            Missing: { color: "bg-gray-100 text-gray-800 border-gray-200", icon: Upload, text: "Manquant" },
        };
        const currentStatus = statusConfig[status];
        const Icon = currentStatus.icon;

        return (
            <Card key={docRequirement.id} className="flex flex-col">
                <CardHeader>
                    <CardTitle className="text-base">{docRequirement.name}</CardTitle>
                    <CardDescription className="text-xs">{docRequirement.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col items-center justify-center">
                    {uploadedDoc?.url ? (
                        <div className={cn("grid w-full gap-2", uploadedDoc.urlVerso ? "grid-cols-2" : "grid-cols-1")}>
                            <a href={uploadedDoc.url} target="_blank" rel="noopener noreferrer" className="aspect-[4/3] w-full rounded-md overflow-hidden border relative block">
                                 <Image src={uploadedDoc.url} alt={`${uploadedDoc.name} Recto`} layout="fill" objectFit="cover" data-ai-hint="official document" />
                            </a>
                            {uploadedDoc.urlVerso && (
                                <a href={uploadedDoc.urlVerso} target="_blank" rel="noopener noreferrer" className="aspect-[4/3] w-full rounded-md overflow-hidden border relative block">
                                    <Image src={uploadedDoc.urlVerso} alt={`${uploadedDoc.name} Verso`} layout="fill" objectFit="cover" data-ai-hint="official document" />
                                </a>
                            )}
                        </div>
                    ) : (
                        <div className="aspect-video w-full rounded-md border-2 border-dashed flex flex-col items-center justify-center bg-muted/50">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mt-2">Aucun fichier</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="p-4 flex flex-col gap-2">
                    {uploadedDoc?.expirationDate && (
                        <div className="text-xs text-muted-foreground flex items-center gap-2 w-full justify-center">
                            <CalendarIcon className="h-3 w-3" />
                            <span>Expire le: {format(new Date(uploadedDoc.expirationDate), 'dd/MM/yyyy')}</span>
                        </div>
                    )}
                     <Badge className={cn("capitalize w-full justify-center py-1", currentStatus.color)}>
                        <Icon className="mr-2 h-4 w-4" />
                        {currentStatus.text}
                    </Badge>
                    <Button variant="secondary" className="w-full" onClick={() => openModal(docRequirement)}>
                        {uploadedDoc ? 'Mettre à jour' : 'Téléverser'}
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <PageHeader title="Mes Documents" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({length: 8}).map((_, i) => <Skeleton key={i} className="h-80 w-full" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="Mes Documents" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {requiredDriverDocs.map(docReq => renderDocumentCard(docReq))}
            </div>

            <Dialog open={isModalOpen} onOpenChange={closeModal}>
                <DialogContent>
                    <form onSubmit={handleSubmit(handleFileUpload)}>
                        <DialogHeader>
                            <DialogTitle>Mettre à jour: {selectedDocRequirement?.name}</DialogTitle>
                            <DialogDescription>{selectedDocRequirement?.description}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                             <div className={cn("grid gap-4", selectedDocRequirement?.hasVerso ? "grid-cols-2" : "grid-cols-1")}>
                                <div className="space-y-2">
                                    <Label htmlFor="fileRecto" className="text-sm">{selectedDocRequirement?.hasVerso ? 'Fichier Recto' : 'Fichier'}</Label>
                                    <Input id="fileRecto" type="file" {...register("fileRecto")} accept="image/*,application/pdf" />
                                </div>
                                {selectedDocRequirement?.hasVerso && (
                                   <div className="space-y-2">
                                        <Label htmlFor="fileVerso" className="text-sm">Fichier Verso</Label>
                                        <Input id="fileVerso" type="file" {...register("fileVerso")} accept="image/*,application/pdf" />
                                    </div>
                                )}
                             </div>
                              {selectedDocRequirement?.hasExpirationDate && (
                                <div className="space-y-2">
                                    <Label htmlFor="expirationDate">Date d'expiration</Label>
                                    <Input id="expirationDate" type="date" {...register("expirationDate")} />
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={closeModal}>Annuler</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Envoi..." : "Sauvegarder"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
