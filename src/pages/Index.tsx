import { ArrowLeft } from "lucide-react";
import { TipsCarousel } from "@/components/TipsCarousel";
import { toast } from "sonner";

const Index = () => {
  const mockTips = [
    {
      id: "1",
      category: "PRO" as const,
      team1: {
        name: "Gremio",
        logo: "https://upload.wikimedia.org/wikipedia/commons/3/32/Gr%C3%AAmio_FBPA_%28logo%29.svg",
      },
      team2: {
        name: "Cruzeiro",
        logo: "https://upload.wikimedia.org/wikipedia/commons/9/90/Cruzeiro_Esporte_Clube_%28logo%29.svg",
      },
      betType: "Ambas as equipes marcam",
      betChoice: "Não",
      odds: 1.92,
    },
    {
      id: "2",
      category: "BÁSICO" as const,
      team1: {
        name: "São Paulo",
        logo: "https://upload.wikimedia.org/wikipedia/commons/6/6f/Brasao_do_Sao_Paulo_Futebol_Clube.svg",
      },
      team2: {
        name: "Flamengo",
        logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Flamengo-RJ_%28BRA%29.png",
      },
      betType: "Total de gols",
      betChoice: "Mais de 1.5",
      odds: 1.44,
    },
    {
      id: "3",
      category: "PRO" as const,
      team1: {
        name: "São Paulo",
        logo: "https://upload.wikimedia.org/wikipedia/commons/6/6f/Brasao_do_Sao_Paulo_Futebol_Clube.svg",
      },
      team2: {
        name: "Flamengo",
        logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Flamengo-RJ_%28BRA%29.png",
      },
      betType: "Escanteios 1x2",
      betChoice: "Fora",
      odds: 1.7,
    },
  ];

  const handleAddTip = (tipId: string) => {
    toast.success("Tip adicionada com sucesso!", {
      description: `Tip ID: ${tipId}`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button 
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Tips do dia</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Tips Carousel */}
        <section>
          <TipsCarousel tips={mockTips} onAddTip={handleAddTip} />
        </section>

        {/* Iframe Section */}
        <section className="w-full">
          <div className="w-full aspect-video bg-muted rounded-lg overflow-hidden">
            <iframe
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              title="Video Player"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
