import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import Tarator from "@/assets/logo.webp"

const LandingPage = () => {
  return (
    <div className="relative w-full overflow-x-clip pb-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-112 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.2),transparent_65%)]" />

      <section className="mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-3 pt-12 md:px-6 md:pt-20">
        <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Private chat for modern times
        </span>

        <div className="max-w-3xl space-y-5">
          <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance md:text-6xl">
            TaraTOR
          </h1>
          <img src={Tarator} alt="TaraTOR logo" className="w-64 rounded-md" />
          <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
            TaraTOR combines nice UI with TOR network to provide secure and
            private chat experience for individuals.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="px-5">
            <Link to="/register">Create your account</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="px-5">
            <Link to="/login">Sign in to chat</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
