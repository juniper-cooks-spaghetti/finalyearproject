"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { ImagePlusIcon, Loader2 } from "lucide-react";
import { useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface EditProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    name: string;
    bio: string;
    location: string;
    website: string;
  };
  setFormData: (data: any) => void;
  onSubmit: () => Promise<void>;
  currentImage?: string | null;
  previewImage?: string | null;
  isSubmitting?: boolean; // Add this prop
  onImageChange: (file: File) => void;
}

export function EditProfileDialog({
  isOpen,
  onClose,
  formData,
  setFormData,
  onSubmit,
  currentImage,
  previewImage,
  isSubmitting = false, // Default to false
  onImageChange
}: EditProfileDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a JPEG, PNG, GIF, or WebP image.",
        });
        return;
      }

      if (file.size > maxSize) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Image must be less than 5MB.",
        });
        return;
      }

      onImageChange(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Only allow closing if not submitting
      if (!isSubmitting && !open) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Profile Image Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage 
                  src={previewImage || currentImage || "/avatar.png"} 
                  alt="Profile picture" 
                />
              </Avatar>
              <Button 
                variant="outline" 
                size="icon" 
                className="absolute bottom-0 right-0 rounded-full size-8"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlusIcon className="size-4" />
              </Button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleImageChange}
            />
          </div>

          {/* Existing Form Fields */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea 
              id="bio"
              value={formData.bio}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input 
              id="location"
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input 
              id="website"
              value={formData.website}
              onChange={e => setFormData({ ...formData, website: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={isSubmitting} // Disable when submitting
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={onSubmit}
            disabled={isSubmitting} // Disable when submitting
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}