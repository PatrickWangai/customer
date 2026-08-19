import Image from "next/image";
import { Mail, Clock, ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublicSupportForm } from "@/components/support/public-support-form";
import { TrackRequestForm } from "@/components/support/track-request-form";
import { HelpChatbot } from "@/components/support/help-chatbot";

export default function HelpAndSupportPage() {
  const supportEmail = process.env.SUPPORT_EMAIL || "support@masterways.co.ke";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md border border-border bg-white p-1">
            <Image src="/logo.jpeg" alt="Masterways" width={32} height={32} className="size-full object-contain" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Masterways Group of Companies</p>
            <p className="text-[11px] text-muted-foreground">Help &amp; Support</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">How can we help?</h1>
          <p className="text-sm text-muted-foreground">
            Submit a complaint, service request or general inquiry and our team will follow up.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <InfoCard icon={Mail} label="Email us" value={supportEmail} />
          <InfoCard icon={Clock} label="Response times" value="Vary by priority — you'll see an estimate after submitting" />
          <InfoCard icon={ShieldCheck} label="Your data" value="Only used to follow up on this request" />
        </div>

        <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <Tabs defaultValue="submit">
            <TabsList>
              <TabsTrigger value="submit">Submit a request</TabsTrigger>
              <TabsTrigger value="track">Track a request</TabsTrigger>
            </TabsList>
            <TabsContent value="submit" className="pt-4">
              <PublicSupportForm />
            </TabsContent>
            <TabsContent value="track" className="pt-4">
              <TrackRequestForm />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <HelpChatbot supportEmail={supportEmail} />
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <p className="mt-1.5 text-sm">{value}</p>
    </div>
  );
}
