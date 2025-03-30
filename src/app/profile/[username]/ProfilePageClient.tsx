"use client";

import { getCompletedRoadmaps, getInProgressRoadmaps, getProfileByUsername, updateProfile } from '@/actions/profile.action';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EditIcon, CalendarIcon, LinkIcon, MapPinIcon } from "lucide-react";
import { format } from "date-fns";
import RoadmapScroller from "@/components/RoadmapScroller";
import { useUser } from '@clerk/nextjs';
import { useState, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { TopicStatus, UserRoadmapTopic } from '@/types/roadmap';

type User = Awaited<ReturnType<typeof getProfileByUsername>>;
type InProgressRoadmaps = Awaited<ReturnType<typeof getInProgressRoadmaps>>;
type CompletedRoadmaps = Awaited<ReturnType<typeof getCompletedRoadmaps>>;

interface ProfilePageClientProps {
  user: NonNullable<User>;
  completedRoadmaps: CompletedRoadmaps;
  inProgressRoadmaps: InProgressRoadmaps;
}

function ProfilePageClient({ user, completedRoadmaps, inProgressRoadmaps }: ProfilePageClientProps) {
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: user.name || '',
    bio: user.bio || '',
    location: user.location || '',
    website: user.website || '',
  });

  const handleEditSubmit = async () => {
    try {
      const formData = new FormData();
      Object.entries(editForm).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (profileImage) {
        formData.append('profileImage', profileImage);
      }

      const result = await updateProfile(formData);
      
      if (result.success) {
        // Reset all states
        setShowEditDialog(false);
        setProfileImage(null);
        setPreviewImageUrl(null);
        
        // Update preview if new image URL is returned
        if ('imageUrl' in result && result.imageUrl) {
          setPreviewImageUrl(result.imageUrl);
        }

        // Show success toast
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile. Please try again.",
      });
    }
  };

  const isOwnProfile = currentUser?.username === user.username || 
    currentUser?.emailAddresses[0]?.emailAddress.split("@")[0] === user.username;

  const transformTopics = (topics: any[]): UserRoadmapTopic[] => {
    return topics.map(topic => ({
      ...topic,
      status: topic.status as TopicStatus,
      customOrder: topic.customOrder || 0,
      topic: {
        ...topic.topic,
        contents: topic.topic.contents.map((content: any) => ({
          content: content.content
        }))
      }
    }));
  };

  return (
    <div className="container max-w-5xl py-8 space-y-8 mx-auto">
      <div className="grid grid-cols-1 gap-6">
        <div className="w-full max-w-lg mx-auto">
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="w-24 h-24">
                  <AvatarImage 
                    src={user.image || "/avatar.png"} 
                    alt={user.name ?? user.username} 
                  />
                </Avatar>

                <h1 className="mt-4 text-2xl font-bold">{user.name ?? user.username}</h1>
                <span className="text-muted-foreground">@{user.username}</span>
                {user.bio && <p className="mt-2 text-sm">{user.bio}</p>}

                {/* Profile Stats */}
                <div className="w-full mt-6">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="flex flex-col items-center">
                      <div className="font-semibold">{user.stats.totalRoadmaps}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="font-semibold">{user.stats.completedRoadmaps}</div>
                      <div className="text-sm text-muted-foreground">Completed</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="font-semibold">{user.stats.inProgressRoadmaps}</div>
                      <div className="text-sm text-muted-foreground">In Progress</div>
                    </div>
                  </div>
                </div>

                {/* Edit Profile Button */}
                {isOwnProfile && (
                  <Button className="w-full mt-4" onClick={() => setShowEditDialog(true)}>
                    <EditIcon className="size-4 mr-2" />
                    Edit Profile
                  </Button>
                )}

                {/* Location & Website */}
                <div className="w-full mt-6 space-y-2 text-sm">
                  {user.location && (
                    <div className="flex items-center text-muted-foreground">
                      <MapPinIcon className="size-4 mr-2" />
                      {user.location}
                    </div>
                  )}
                  {user.website && (
                    <div className="flex items-center text-muted-foreground">
                      <LinkIcon className="size-4 mr-2" />
                      <a
                        href={user.website.startsWith("http") ? user.website : `https://${user.website}`}
                        className="hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {user.website}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center text-muted-foreground">
                    <CalendarIcon className="size-4 mr-2" />
                    Joined {format(new Date(user.createdAt), 'MMMM yyyy')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <EditProfileDialog 
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setProfileImage(null);
          setPreviewImageUrl(null);
        }}
        formData={editForm}
        setFormData={setEditForm}
        onSubmit={handleEditSubmit}
        currentImage={user.image}
        previewImage={previewImageUrl}
        onImageChange={(file) => {
          setProfileImage(file);
          setPreviewImageUrl(URL.createObjectURL(file));
        }}
      />

      <Tabs defaultValue="in-progress" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value="in-progress">
          {inProgressRoadmaps.map((roadmap) => (
            <div key={roadmap.id} className="mb-8">
              <h3 className="text-xl font-semibold mb-4">{roadmap.roadmap.title}</h3>
              <RoadmapScroller 
                topics={transformTopics(roadmap.topics)}
                userRoadmapId={roadmap.id}
                roadmapId={roadmap.roadmapId}
                readOnly={true}
                profileUserId={user.id} // Pass the profile owner's ID
              />
            </div>
          ))}
        </TabsContent>
        <TabsContent value="completed">
          {completedRoadmaps.map((roadmap) => (
            <div key={roadmap.id} className="mb-8">
              <h3 className="text-xl font-semibold mb-4">{roadmap.roadmap.title}</h3>
              <RoadmapScroller 
                topics={transformTopics(roadmap.topics)}
                userRoadmapId={roadmap.id}
                roadmapId={roadmap.roadmapId}
                readOnly={true}
                profileUserId={user.id} // Pass the profile owner's ID
              />
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProfilePageClient;