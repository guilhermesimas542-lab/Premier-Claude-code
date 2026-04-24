const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId } = await req.json();

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: "eventId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = `https://sb2frontend-altenar2.biahosted.com/api/widget/GetEventDetails?culture=pt-BR&timezoneOffset=180&integration=esportiva&deviceType=1&numFormat=en-GB&countryCode=BR&eventId=${eventId}&showNonBoosts=false`;

    const response = await fetch(url);
    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Altenar proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao buscar dados do evento" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
