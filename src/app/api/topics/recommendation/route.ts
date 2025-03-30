import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { roadmapId } = await request.json();
    if (!roadmapId) {
      return NextResponse.json(
        { error: "Roadmap ID is required" },
        { status: 400 }
      );
    }

    // Get all transitions for this roadmap
    const transitions = await prisma.topicRecommendation.findMany({
      where: { roadmapId },
      select: {
        beforeTopicId: true,
        afterTopicId: true,
        transitionCount: true
      }
    });

    console.log('Found transitions:', transitions.map(t => ({
      beforeTopicId: t.beforeTopicId || 'null',
      afterTopicId: t.afterTopicId,
      transitionCount: t.transitionCount
    })));

    // Get roadmap completion data
    const roadmaps = await prisma.userRoadmap.findMany({
      where: { roadmapId },
      select: {
        id: true,
        completed: true,
        topics: {
          select: {
            topicId: true,
            isSkipped: true
          }
        }
      }
    });

    const updates = [];
    
    for (const transition of transitions) {
      let transitionScore = 0;
      let completionScore = 50;
      let notSkippedScore = 50;

      // Log each transition being processed
      console.log('Processing transition:', {
        beforeTopicId: transition.beforeTopicId || 'null',
        afterTopicId: transition.afterTopicId
      });

      if (transition.beforeTopicId === null) {
        console.log('Processing initial topic:', transition.afterTopicId);
        
        // Calculate initial topic scores
        const initialTopics = transitions.filter(t => t.beforeTopicId === null);
        const totalInitialTransitions = initialTopics.reduce((sum, t) => sum + t.transitionCount, 0);

        // Calculate transition score based on how often this topic is chosen as initial
        transitionScore = totalInitialTransitions > 0
          ? (transition.transitionCount / totalInitialTransitions) * 100
          : 0;

        // Look at completion rate for roadmaps that start with this topic
        const topicRoadmaps = roadmaps.filter(rm => {
          const topicInRoadmap = rm.topics.some(t => t.topicId === transition.afterTopicId);
          return topicInRoadmap;
        });

        if (topicRoadmaps.length > 0) {
          const completedCount = topicRoadmaps.filter(rm => rm.completed).length;
          completionScore = (completedCount / topicRoadmaps.length) * 100;
          notSkippedScore = 100; // Initial topics are never skipped
        }

        console.log('Initial topic scores:', {
          topicId: transition.afterTopicId,
          transitionScore,
          completionScore,
          notSkippedScore,
          roadmapsCount: topicRoadmaps.length
        });

        // Calculate confidence score for initial topics
        const confidence = (
          0.5 * transitionScore +
          0.3 * completionScore +
          0.2 * notSkippedScore
        ) / 100;

        try {
          // First try to find the existing record
          const existingRecommendation = await prisma.topicRecommendation.findFirst({
            where: {
              roadmapId,
              afterTopicId: transition.afterTopicId,
              beforeTopicId: null
            }
          });

          if (existingRecommendation) {
            // Update existing record
            await prisma.topicRecommendation.update({
              where: { id: existingRecommendation.id },
              data: {
                weight: Math.max(0, Math.min(1, confidence)),
                lastTransitionAt: new Date()
              }
            });
          } else {
            // Create new record
            await prisma.topicRecommendation.create({
              data: {
                roadmapId,
                afterTopicId: transition.afterTopicId,
                beforeTopicId: null,
                weight: Math.max(0, Math.min(1, confidence)),
                lastTransitionAt: new Date(),
                transitionCount: transition.transitionCount
              }
            });
          }

          updates.push({
            beforeTopicId: null,
            afterTopicId: transition.afterTopicId,
            scores: { transitionScore, completionScore, notSkippedScore },
            finalWeight: confidence,
            type: 'initial'
          });
        } catch (updateError) {
          console.error('Error updating initial recommendation:', {
            afterTopicId: transition.afterTopicId,
            error: updateError
          });
        }
      } else {
        // Calculate scores for non-initial recommendations
        const allTransitionsFromTopic = transitions
          .filter(t => t.beforeTopicId === transition.beforeTopicId)
          .reduce((sum, t) => sum + t.transitionCount, 0);

        transitionScore = allTransitionsFromTopic > 0 
          ? (transition.transitionCount / allTransitionsFromTopic) * 100
          : 0;

        const relevantRoadmaps = roadmaps.filter(rm => 
          rm.topics.some(t => t.topicId === transition.beforeTopicId) &&
          rm.topics.some(t => t.topicId === transition.afterTopicId)
        );

        completionScore = relevantRoadmaps.length > 0
          ? (relevantRoadmaps.filter(rm => rm.completed).length / relevantRoadmaps.length) * 100
          : 50;

        const topicRoadmaps = roadmaps.filter(rm =>
          rm.topics.some(t => t.topicId === transition.beforeTopicId)
        );

        notSkippedScore = topicRoadmaps.length > 0
          ? (topicRoadmaps.filter(rm => 
              !rm.topics.find(t => t.topicId === transition.beforeTopicId)?.isSkipped
            ).length / topicRoadmaps.length) * 100
          : 50;

        const confidence = (
          0.5 * transitionScore +
          0.3 * completionScore +
          0.2 * notSkippedScore
        ) / 100;

        try {
          await prisma.topicRecommendation.upsert({
            where: {
              roadmapId_afterTopicId_beforeTopicId: {
                roadmapId,
                afterTopicId: transition.afterTopicId,
                beforeTopicId: transition.beforeTopicId
              }
            },
            update: {
              weight: Math.max(0, Math.min(1, confidence)),
              lastTransitionAt: new Date()
            },
            create: {
              roadmapId,
              afterTopicId: transition.afterTopicId,
              beforeTopicId: transition.beforeTopicId,
              weight: Math.max(0, Math.min(1, confidence)),
              lastTransitionAt: new Date(),
              transitionCount: transition.transitionCount
            }
          });

          updates.push({
            beforeTopicId: transition.beforeTopicId,
            afterTopicId: transition.afterTopicId,
            scores: { transitionScore, completionScore, notSkippedScore },
            finalWeight: confidence,
            type: 'subsequent'
          });
        } catch (updateError) {
          console.error('Error updating recommendation:', {
            type: 'subsequent',
            afterTopicId: transition.afterTopicId,
            error: updateError
          });
        }
      }
    }

    const processedInitial = updates.filter(u => u.type === 'initial').length;
    const processedSubsequent = updates.filter(u => u.type === 'subsequent').length;

    console.log('Processing summary:', {
      total: transitions.length,
      initial: processedInitial,
      subsequent: processedSubsequent
    });

    return NextResponse.json({ 
      success: true,
      updates,
      totalProcessed: transitions.length,
      initialTopicsProcessed: processedInitial,
      subsequentTopicsProcessed: processedSubsequent
    });

  } catch (error) {
    console.error('Error updating recommendation weights:', error);
    return NextResponse.json(
      { error: "Failed to update recommendation weights" },
      { status: 500 }
    );
  }
}