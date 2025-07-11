
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Upload, FileCheck2, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
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
  file: z.instanceof(FileList).refine(files => files.length > 0, 'Un fichier est requis.'),
});

type FileUploadForm = z.infer<typeof fileUploadSchema>;

export default function DriverDocumentsPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [documents, setDocuments] = useState<DriverDocument[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDocRequirement, setSelectedDocRequirement] = useState<RequiredDriverDoc | null>(null);

    const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FileUploadForm>({
        resolver: zodResolver(fileUploadSchema)
    });
    const watchedFile = watch("file");

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

    const updateUserData = async (dataToUpdate: object) => {
        if (!user) return;
        try {
            const userRef = doc(db, "users", user.id);
            await updateDoc(userRef, dataToUpdate);
        } catch (error) {
            console.error('Error updating user data:', error);
            throw new Error("Mise à jour échouée.");
        }
    };
  
    const handleFileUpload = async (data: FileUploadForm) => {
        if (!user || !selectedDocRequirement || !data.file) return;
        
        const file = data.file[0];
        const storageRef = ref(storage, `driver-documents/${user.uid}/${selectedDocRequirement.id}_${Date.now()}_${file.name}`);
        
        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const existingDocIndex = documents.findIndex(d => d.id === selectedDocRequirement.id);
            
            let updatedDocuments: DriverDocument[];

            const newDocument: DriverDocument = {
                id: selectedDocRequirement.id,
                name: selectedDocRequirement.name,
                type: selectedDocRequirement.type,
                url: downloadURL,
                status: 'Pending',
            };

            if (existingDocIndex > -1) {
                // If old doc exists, delete it from storage
                const oldUrl = documents[existingDocIndex].url;
                if (oldUrl) {
                    try {
                        const oldStorageRef = ref(storage, oldUrl);
                        await deleteObject(oldStorageRef);
                    } catch (storageError: any) {
                        // Ignore if file not found, but log other errors
                        if (storageError.code !== 'storage/object-not-found') {
                            console.error("Error deleting old document from storage:", storageError);
                        }
                    }
                }
                updatedDocuments = documents.map((doc, index) => index === existingDocIndex ? newDocument : doc);
            } else {
                updatedDocuments = [...documents, newDocument];
            }

            await updateUserData({ 'driverProfile.documents': updatedDocuments });
            setDocuments(updatedDocuments);
            toast({ title: 'Succès', description: 'Document téléversé avec succès. Il est en attente de validation.' });
            closeModal();
        } catch (error) {
            console.error("Error uploading document:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de téléverser le document.' });
        }
    };
    
    const openModal = (docRequirement: RequiredDriverDoc) => {
        setSelectedDocRequirement(docRequirement);
        reset();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedDocRequirement(null);
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
                        <div className="aspect-video w-full rounded-md overflow-hidden border relative">
                             <Image src={uploadedDoc.url} alt={uploadedDoc.name} layout="fill" objectFit="cover" data-ai-hint="official document" />
                        </div>
                    ) : (
                        <div className="aspect-video w-full rounded-md border-2 border-dashed flex flex-col items-center justify-center bg-muted/50">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mt-2">Aucun fichier</p>
                        </div>
                    )}
                </CardContent>
                <CardContent className="p-4 flex flex-col gap-2">
                     <Badge className={cn("capitalize w-full justify-center py-1", currentStatus.color)}>
                        <Icon className="mr-2 h-4 w-4" />
                        {currentStatus.text}
                    </Badge>
                    <Button variant="secondary" onClick={() => openModal(docRequirement)}>
                        {uploadedDoc ? 'Mettre à jour' : 'Téléverser'}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <PageHeader title="Mes Documents" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({length: 8}).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
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

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <form onSubmit={handleSubmit(handleFileUpload)}>
                        <DialogHeader>
                            <DialogTitle>Téléverser: {selectedDocRequirement?.name}</DialogTitle>
                            <DialogDescription>{selectedDocRequirement?.description}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="file" className="sr-only">Fichier</Label>
                                <Input id="file" type="file" {...register("file")} accept="image/*,application/pdf" />
                                {errors.file && <p className="text-destructive text-xs mt-1">{errors.file.message}</p>}
                            </div>
                            {watchedFile?.[0] && (
                                <div className="text-center p-4 border rounded-md">
                                    <FileCheck2 className="h-16 w-16 mx-auto text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground mt-2 truncate">{watchedFile[0].name}</p>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={closeModal}>Annuler</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Envoi..." : "Téléverser et soumettre"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
