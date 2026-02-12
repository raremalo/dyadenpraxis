import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  sessionId: string;
  includeThird?: boolean;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Auth: JWT aus Header validieren
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Nicht autorisiert" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // User aus JWT extrahieren
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Ungültiger Token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Request Body lesen
    const { sessionId, includeThird = false }: RequestBody = await req.json();
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "sessionId fehlt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Session aus DB laden und validieren
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, requester_id, partner_id, third_participant_id, duration, status")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: "Session nicht gefunden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Nur Requester darf Room erstellen
    if (session.requester_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Nur der Anfragende kann den Room erstellen" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Session muss accepted sein
    if (session.status !== "accepted") {
      return new Response(
        JSON.stringify({ error: "Session muss zuerst akzeptiert werden" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Daily.co Room erstellen
    const roomName = `dyade-${sessionId.slice(0, 8)}-${Date.now()}`;
    const expirySeconds = (session.duration + 10) * 60; // Session-Dauer + 10 min Puffer

    const roomResponse = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          exp: Math.floor(Date.now() / 1000) + expirySeconds,
          max_participants: includeThird ? 3 : 2,
          enable_chat: false,
          enable_knocking: false,
          start_video_off: false,
          start_audio_off: false,
        },
      }),
    });

    if (!roomResponse.ok) {
      const errData = await roomResponse.text();
      console.error("Daily.co Room-Erstellung fehlgeschlagen:", errData);
      return new Response(
        JSON.stringify({ error: "Video-Room konnte nicht erstellt werden" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const room = await roomResponse.json();
    const roomUrl = room.url;

    // 5. Meeting Tokens generieren
    const createToken = async (userName: string): Promise<string> => {
      const tokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify({
          properties: {
            room_name: roomName,
            user_name: userName,
            exp: Math.floor(Date.now() / 1000) + expirySeconds,
          },
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Token-Erstellung fehlgeschlagen");
      }

      const tokenData = await tokenResponse.json();
      return tokenData.token;
    };

    // Requester-Name laden
    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", session.requester_id)
      .single();

    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", session.partner_id)
      .single();

    const requesterToken = await createToken(requesterProfile?.name || "Teilnehmer 1");
    const partnerToken = await createToken(partnerProfile?.name || "Teilnehmer 2");

    let thirdToken: string | null = null;
    if (includeThird && session.third_participant_id) {
      const { data: thirdProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", session.third_participant_id)
        .single();

      thirdToken = await createToken(thirdProfile?.name || "Teilnehmer 3");
    }

    // 6. Session in DB aktualisieren
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        room_url: roomUrl,
        room_token: requesterToken,
        partner_token: partnerToken,
        third_participant_token: thirdToken,
        status: "active",
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error("Session-Update fehlgeschlagen:", updateError);
      // Room wurde erstellt, aber DB-Update failed - trotzdem Tokens zurückgeben
    }

    // 7. Erfolg
    return new Response(
      JSON.stringify({
        roomUrl,
        tokens: {
          requester: requesterToken,
          partner: partnerToken,
          third: thirdToken,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("create-room Fehler:", err);
    return new Response(
      JSON.stringify({ error: "Interner Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
