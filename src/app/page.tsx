import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Brain, BarChart } from "lucide-react";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { SignUpButton } from "@clerk/nextjs";

export default async function LandingPage() {
  const user = await currentUser();

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Hero Section with Background Elements */}
        <section className="relative w-full py-12 md:py-24 lg:py-32 xl:py-48 overflow-hidden">
          {/* Background Elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-100 dark:bg-blue-900/20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-100 dark:bg-purple-900/20 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl opacity-50"></div>
          
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Your Learning Journey Starts Here
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Create personalized learning roadmaps, track your progress, and discover the best path to master new skills.
                </p>
              </div>
              <div className="space-x-4">
                {user ? (
                  <Link href="/dashboard">
                    <Button>
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <SignUpButton mode="modal">
                    <Button>
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </SignUpButton>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced Feature Section with Icons */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-900/50">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white dark:bg-gray-900/40 p-6 rounded-lg shadow-sm flex flex-col items-center text-center backdrop-blur-sm">
                <div className="w-12 h-12 bg-blue-100 dark:bg-purple-300/20 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-blue-600 dark:text-purple-300" />
                </div>
                <h3 className="text-xl font-bold dark:text-purple-100">Personalized Learning Paths</h3>
                <p className="text-gray-500 dark:text-purple-200/70 mt-2">
                  Create custom roadmaps tailored to your learning goals and pace
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-900/40 p-6 rounded-lg shadow-sm flex flex-col items-center text-center backdrop-blur-sm">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-200/25 rounded-full flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-purple-600 dark:text-purple-200" />
                </div>
                <h3 className="text-xl font-bold dark:text-purple-100">Smart Recommendations</h3>
                <p className="text-gray-500 dark:text-purple-200/70 mt-2">
                  Get intelligent suggestions for what to learn next based on your progress
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-900/40 p-6 rounded-lg shadow-sm flex flex-col items-center text-center backdrop-blur-sm">
                <div className="w-12 h-12 bg-green-100 dark:bg-purple-400/20 rounded-full flex items-center justify-center mb-4">
                  <BarChart className="h-6 w-6 text-green-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-bold dark:text-purple-100">Track Your Progress</h3>
                <p className="text-gray-500 dark:text-purple-200/70 mt-2">
                  Monitor your advancement and celebrate your learning achievements
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="w-full py-16 md:py-20 bg-blue-600 dark:bg-purple-900/80 relative overflow-hidden">
          <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-purple-800/50 dark:to-purple-900/50 backdrop-blur-sm"></div>
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white dark:text-purple-50">
                Ready to Transform Your Learning Journey?
              </h2>
              <p className="text-blue-100 dark:text-purple-200/90">
                Join all of us at LifelongLearning@EEE who are achieving their goals faster with personalized learning paths.
              </p>
              {!user && (
                <SignUpButton mode="modal">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="bg-white dark:bg-purple-50 text-blue-600 dark:text-purple-900 
                      hover:bg-blue-50 dark:hover:bg-purple-100 border-white dark:border-purple-200
                      transition-colors duration-200"
                  >
                    Start Learning Today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </SignUpButton>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}