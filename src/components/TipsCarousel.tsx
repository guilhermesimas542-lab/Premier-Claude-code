import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { BettingTipCard } from "./BettingTipCard";

interface Tip {
  id: string;
  category: "PRO" | "BÁSICO";
  team1: {
    name: string;
    logo: string;
  };
  team2: {
    name: string;
    logo: string;
  };
  betType: string;
  betChoice: string;
  odds: number;
}

interface TipsCarouselProps {
  tips: Tip[];
  onAddTip?: (tipId: string) => void;
}

export const TipsCarousel = ({ tips, onAddTip }: TipsCarouselProps) => {
  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
      }}
      className="w-full"
    >
      <CarouselContent className="-ml-4">
        {tips.map((tip) => (
          <CarouselItem key={tip.id} className="pl-4 basis-auto">
            <BettingTipCard
              category={tip.category}
              team1={tip.team1}
              team2={tip.team2}
              betType={tip.betType}
              betChoice={tip.betChoice}
              odds={tip.odds}
              onAddTip={() => onAddTip?.(tip.id)}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden md:flex h-10 w-10 bg-[#eac064]/20 border-2 border-[#eac064] shadow-[0_0_15px_rgba(74,222,128,0.8)] hover:bg-[#eac064]/40 text-[#eac064] hover:text-[#eac064] -left-5" />
      <CarouselNext className="hidden md:flex h-10 w-10 bg-[#eac064]/20 border-2 border-[#eac064] shadow-[0_0_15px_rgba(74,222,128,0.8)] hover:bg-[#eac064]/40 text-[#eac064] hover:text-[#eac064] -right-5" />
    </Carousel>
  );
};
