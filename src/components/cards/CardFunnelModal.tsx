import { useState } from "react";
import { FunnelPopup, FunnelPopupData } from "@/components/FunnelPopup";
import { EmbeddedCheckout } from "@/components/EmbeddedCheckout";
import type { CardData } from "@/hooks/useCards";

interface Props {
  card: CardData;
  open: boolean;
  onClose: () => void;
}

export function CardFunnelModal({ card, open, onClose }: Props) {
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  if (!open) return null;

  const questions = card.questions || [];
  const hasQuestions = questions.length > 0;

  // If card has funnel questions, build a FunnelPopupData and delegate
  if (hasQuestions) {
    const popupData: FunnelPopupData = {
      id: card.id,
      type: "card_funnel",
      image_url: card.image_urls?.mobile || null,
      button_url: card.checkout_url,
      question_1_text: questions[0]?.text || null,
      question_1_options: questions[0]?.options || null,
      question_2_text: questions[1]?.text || null,
      question_2_options: questions[1]?.options || null,
      question_3_text: questions[2]?.text || null,
      question_3_options: questions[2]?.options || null,
      final_title: null,
      final_benefits: null,
      checkout_link: card.checkout_url,
    };

    return <FunnelPopup popup={popupData} onClose={onClose} />;
  }

  // No funnel, just open embedded checkout directly
  if (card.checkout_url) {
    return (
      <EmbeddedCheckout
        open={open}
        onClose={onClose}
        url={card.checkout_url}
      />
    );
  }

  return null;
}
