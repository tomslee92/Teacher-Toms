import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${Deno.env.get("CRON_SECRET")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const res = await fetch(`${Deno.env.get("APP_URL")}/api/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: Deno.env.get("NOTIFY_SECRET"),
      title: "🎙 WAYVE — 오늘의 질문",
      body: "오늘의 질문이 도착했어요! Tap to answer.",
    }),
  });

  return new Response(JSON.stringify({ ok: res.ok }), { status: 200 });
});