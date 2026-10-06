import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeafMark } from "@/components/Logo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Dr. Ayus Homoeopathy Hospital" },
      { name: "description", content: "Set a new password for your Dr. Ayus clinic account." },
      { property: "og:title", content: "Choose a new password — Dr. Ayus Homoeopathy Hospital" },
      { property: "og:description", content: "Set a new password for your Dr. Ayus clinic account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-soft w-full max-w-sm p-8"
      >
        <LeafMark className="h-10 w-10 text-primary" />
        <Info className="mt-5 h-8 w-8 text-primary" strokeWidth={1.6} />
        <h1 className="mt-3 font-display text-2xl">Password Reset</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Password resets are managed locally. Please contact your clinic's Doctor or Administrator to reset your password. They can do this from the Settings page.
        </p>

        <Button asChild variant="default" className="mt-6 h-11 w-full rounded-xl">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
