import { AudioProcessor } from "@/components/audio-processor"
import BeatMaker from "@/components/beat-maker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Tabs defaultValue="audio-processor" className="h-screen">
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-6">
            <TabsList className="h-12 bg-transparent">
              <TabsTrigger value="audio-processor" className="text-sm">
                Audio Processor
              </TabsTrigger>
              <TabsTrigger value="beat-maker" className="text-sm">
                Beat Maker
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
        
        <TabsContent value="audio-processor" className="m-0 h-[calc(100vh-3rem)] overflow-auto">
          <AudioProcessor />
        </TabsContent>
        
        <TabsContent value="beat-maker" className="m-0 h-[calc(100vh-3rem)]">
          <BeatMaker />
        </TabsContent>
      </Tabs>
    </main>
  )
}
