import { getProfileByUsername, getCompletedRoadmaps, getInProgressRoadmaps } from '@/actions/profile.action';
import { notFound } from 'next/navigation';
import ProfilePageClient from './ProfilePageClient';

export async function generateMetadata({params}: {params: {username: string}}) {
  const user = await getProfileByUsername(params.username);
  
  if (!user) {
    return {
      title: 'User Not Found',
      description: 'The requested profile could not be found.',
    };
  }

  return {
    title: `${user.name ?? user.username} | CircuitLearn`,
    description: user.bio || `Check out ${user.username}'s profile.`,
  };
}

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const user = await getProfileByUsername(params.username);
  
  if (!user) {
    notFound();
  }
  
  // Fetch roadmaps data
  const completedRoadmaps = await getCompletedRoadmaps(user.id);
  const inProgressRoadmaps = await getInProgressRoadmaps(user.id);

  return (
    <ProfilePageClient 
      user={user} 
      completedRoadmaps={completedRoadmaps} 
      inProgressRoadmaps={inProgressRoadmaps}
    />
  );
}